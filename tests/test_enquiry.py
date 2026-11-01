"""Boundary, durable acceptance and delivery failure tests; no live AWS dependency."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import sys
import time
import types
import unittest
from unittest.mock import Mock, patch


class AwsError(Exception):
    def __init__(self, code='ServiceUnavailable', status=400):
        self.response = {'Error': {'Code': code}, 'ResponseMetadata': {'HTTPStatusCode': status}}
        super().__init__(code)


class ConditionalError(AwsError):
    pass


class Table:
    """Small stateful fake: exercise retries against previous request state."""
    def __init__(self):
        self.items = {}
        self.meta = types.SimpleNamespace(client=types.SimpleNamespace(exceptions=types.SimpleNamespace(ConditionalCheckFailedException=ConditionalError)))

    def get_item(self, Key, **kwargs):
        return {'Item': copy.deepcopy(self.items[Key['pk']])} if Key['pk'] in self.items else {}

    def put_item(self, Item, **kwargs):
        if Item['pk'] in self.items:
            raise ConditionalError()
        self.items[Item['pk']] = copy.deepcopy(Item)

    def update_item(self, Key, ExpressionAttributeValues, UpdateExpression, ConditionExpression='', **kwargs):
        key, v = Key['pk'], ExpressionAttributeValues
        if key.startswith(('RATE#', 'DAILY#')):
            item = self.items.setdefault(key, {'pk': key, 'count': 0})
            if item['count'] >= v[':limit']:
                raise ConditionalError()
            item.update(count=item['count'] + 1, expiresAt=v[':expiry'])
            return
        item = self.items[key]
        if '#status IN' in ConditionExpression:
            choices = [v[k] for k in (':pending', ':failed', ':queued') if k in v]
            if item['status'] not in choices or (':now' in v and item.get('lockedUntil', 0) > v[':now']):
                raise ConditionalError()
        elif ConditionExpression and item['status'] != v[':pending']:
            raise ConditionalError()
        state = next((v[k] for k in (':delivering', ':sent', ':pending', ':queued') if k in v and f'= {k}' in UpdateExpression), None)
        if state:
            item['status'] = state
        for attr, token in [('lockedUntil', ':lock'), ('expiresAt', ':expiry'), ('messageId', ':message'), ('sentAt', ':now')]:
            if token in v and attr in UpdateExpression.split('REMOVE')[0]:
                item[attr] = v[token]
        if 'REMOVE lockedUntil' in UpdateExpression:
            item.pop('lockedUntil', None)


class EnquiryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        modules = {'boto3': Mock(), 'botocore': types.ModuleType('botocore'), 'botocore.config': types.SimpleNamespace(Config=Mock()), 'botocore.exceptions': types.SimpleNamespace(BotoCoreError=ConnectionError, ClientError=AwsError)}
        env = {'ENQUIRY_TABLE': 'test-enquiries', 'BUSINESS_EMAIL': 'noxy@hydrotecbuildingprotectiongroup.com.au', 'ALLOWED_ORIGIN': 'https://preview.example', 'DAILY_LIMIT': '100', 'DELIVERY_QUEUE_URL': 'https://sqs.example/delivery.fifo'}
        with patch.dict(sys.modules, modules), patch.dict(os.environ, env):
            for name in ('enquiry', 'delivery'):
                spec = importlib.util.spec_from_file_location(name, Path(__file__).parents[1] / f'backend/{name}.py')
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                setattr(cls, name, module)

    def setUp(self):
        self.table = Table()
        self.enquiry.table = self.delivery.table = self.table
        self.enquiry.queue = Mock()
        self.delivery.ses = Mock()
        self.delivery.ses.send_email.return_value = {'MessageId': 'accepted-message'}
        self.delivery.RECIPIENT = 'noxy@hydrotecbuildingprotectiongroup.com.au'
        self.data = {'name': 'Website integration test', 'contact': 'visitor@example.com', 'suburb': 'Brisbane', 'problem': 'Test enquiry; no customer work required.', 'service': '', 'role': '', 'timing': '', 'report': '', 'website': '', 'submissionId': 'cc2ad3c3-e812-4198-919b-a11d8f838285', 'startedAt': int((time.time() - 10) * 1000)}
        self.sleep = patch.object(self.delivery.time, 'sleep')
        self.sleep.start()
        self.addCleanup(self.sleep.stop)

    def event(self, data=None):
        return {'headers': {'origin': self.enquiry.ORIGIN, 'content-type': 'application/json'}, 'requestContext': {'http': {'method': 'POST', 'sourceIp': '192.0.2.1'}}, 'body': json.dumps(self.data if data is None else data)}

    def send(self, event=None):
        return self.enquiry.handler(self.event() if event is None else event, None)

    def work(self):
        return self.delivery.handler({'Records': [{'messageId': 'queue-message', 'body': json.dumps({'submissionId': self.data['submissionId']})}]}, None)

    def item(self):
        return self.table.items[f"ENQUIRY#{self.data['submissionId']}"]

    def test_success_requires_storage_and_queue_but_not_immediate_email(self):
        self.assertEqual(self.send()['statusCode'], 202)
        self.assertEqual(self.item()['status'], 'QUEUED')
        self.assertGreater(self.item()['expiresAt'], time.time() + 29 * 86400)
        request = self.enquiry.queue.send_message.call_args.kwargs
        self.assertEqual(json.loads(request['MessageBody']), {'submissionId': self.data['submissionId']})
        self.assertNotIn(self.data['contact'], request['MessageBody'])
        self.delivery.ses.send_email.assert_not_called()

    def test_fixed_sender_recipient_and_visitor_reply_to(self):
        self.data['to'] = 'attacker@example.net'
        self.send()
        self.assertEqual(self.work(), {'batchItemFailures': []})
        call = self.delivery.ses.send_email.call_args.kwargs
        self.assertEqual(call['Destination'], {'ToAddresses': [self.delivery.RECIPIENT]})
        self.assertIn(self.delivery.SENDER, call['FromEmailAddress'])
        self.assertEqual(call['ReplyToAddresses'], ['visitor@example.com'])
        self.assertEqual(self.item()['status'], 'SENT')

    def test_sender_and_recipient_can_differ_without_visitor_control(self):
        self.delivery.RECIPIENT = 'fixed-recipient@example.net'
        self.send();self.work()
        call = self.delivery.ses.send_email.call_args.kwargs
        self.assertEqual(call['Destination']['ToAddresses'], ['fixed-recipient@example.net'])
        self.assertIn(self.delivery.SENDER, call['FromEmailAddress'])

    def test_phone_contact_does_not_become_email_header(self):
        self.data['contact'] = '0456 123 456'
        self.send();self.work()
        self.assertNotIn('ReplyToAddresses', self.delivery.ses.send_email.call_args.kwargs)

    def test_repeat_submission_and_queue_redelivery_do_not_send_twice(self):
        first = self.send()
        self.assertEqual(self.send()['body'], first['body'])
        self.enquiry.queue.send_message.assert_called_once()
        self.work();self.work();self.send()
        self.delivery.ses.send_email.assert_called_once()

    def test_changed_details_same_id_rejected(self):
        self.send();self.data['problem'] = 'Changed'
        self.assertEqual(self.send()['statusCode'], 409)
        self.enquiry.queue.send_message.assert_called_once()

    def test_origin_method_content_type_checked_before_storage(self):
        for mutate, expected in ((lambda e:e['headers'].update(origin='https://other.example'),403), (lambda e:e['requestContext']['http'].update(method='GET'),405), (lambda e:e['headers'].update({'content-type':'text/plain'}),415)):
            event = self.event();mutate(event)
            self.assertEqual(self.send(event)['statusCode'], expected)
        self.assertFalse(self.table.items)

    def test_invalid_input_and_honeypot_rejected(self):
        for changes in ({'name':''}, {'contact':'not a phone or email'}, {'contact':'visitor@example.com\r\nBcc: someone@example.com'}, {'name':'bad\nheader'}, {'service':'made up option'}, {'problem':'x'*2001}, {'submissionId':'wrong'}, {'website':'spam.example'}, {'startedAt':int(time.time()*1000)}):
            with self.subTest(changes=changes):
                self.assertEqual(self.send(self.event({**self.data, **changes}))['statusCode'],400)
        self.assertFalse(self.table.items)
        self.enquiry.queue.send_message.assert_not_called()

    def test_bad_json_and_oversized_body(self):
        event=self.event();event['body']='{"name":'
        self.assertEqual(self.send(event)['statusCode'],400)
        event['body']='x'*24001
        self.assertEqual(self.send(event)['statusCode'],413)

    def test_daily_limit_stops_acceptance(self):
        now=int(time.time());day=self.enquiry.datetime.fromtimestamp(now,self.enquiry.timezone.utc).strftime('%Y-%m-%d')
        self.table.items[f'DAILY#{day}']={'pk':f'DAILY#{day}','count':100}
        self.assertEqual(self.send()['statusCode'],429)
        self.enquiry.queue.send_message.assert_not_called()

    def test_queue_failure_keeps_private_backup_and_retry_uses_same_id(self):
        self.enquiry.queue.send_message.side_effect=AwsError('ServiceUnavailable')
        with self.assertLogs(level='INFO') as logs:
            self.assertEqual(self.send()['statusCode'],503)
        self.assertNotIn(self.data['contact'],' '.join(logs.output))
        self.assertEqual(self.item()['status'],'PENDING_QUEUE')
        self.assertEqual(self.send()['statusCode'],409)
        self.enquiry.queue.send_message.side_effect=None
        with patch.object(self.enquiry.time,'time',return_value=time.time()+46):
            self.assertEqual(self.send()['statusCode'],202)
        calls=self.enquiry.queue.send_message.call_args_list
        self.assertEqual(calls[0].kwargs['MessageDeduplicationId'],calls[-1].kwargs['MessageDeduplicationId'])

    def test_definite_ses_rejection_retries_from_queue(self):
        self.send();self.delivery.ses.send_email.side_effect=AwsError('TooManyRequestsException')
        self.assertTrue(self.work()['batchItemFailures'])
        self.assertEqual(self.item()['status'],'QUEUED')
        self.delivery.ses.send_email.side_effect=None
        self.assertFalse(self.work()['batchItemFailures'])
        self.assertEqual(self.item()['status'],'SENT')

    def test_timeout_does_not_blindly_send_a_duplicate(self):
        self.send();self.delivery.ses.send_email.side_effect=ConnectionError('Timeout')
        self.assertTrue(self.work()['batchItemFailures'])
        self.delivery.ses.send_email.side_effect=None
        self.assertTrue(self.work()['batchItemFailures'])
        self.delivery.ses.send_email.assert_called_once()
        self.assertEqual(self.item()['status'],'DELIVERING')

    def test_server_error_is_treated_as_ambiguous(self):
        self.send();self.delivery.ses.send_email.side_effect=AwsError('InternalServerError',500)
        self.work();self.work()
        self.delivery.ses.send_email.assert_called_once()

    def test_metadata_failure_after_acceptance_does_not_resend(self):
        self.send()
        original=self.table.update_item
        def fail_sent(**kwargs):
            if ':sent' in kwargs['ExpressionAttributeValues']:raise ConnectionError('Test metadata failure')
            return original(**kwargs)
        with patch.object(self.table,'update_item',side_effect=fail_sent):
            self.assertTrue(self.work()['batchItemFailures'])
        self.work()
        self.delivery.ses.send_email.assert_called_once()

    def test_worker_does_not_overwrite_delivery_during_queue_metadata_race(self):
        def deliver_before_queue_response(**kwargs):
            self.work()
        self.enquiry.queue.send_message.side_effect=deliver_before_queue_response
        self.assertEqual(self.send()['statusCode'],202)
        self.assertEqual(self.item()['status'],'SENT')

    def test_expired_backups_are_not_emailed(self):
        self.send();self.item()['expiresAt']=int(time.time())-1
        self.assertTrue(self.work()['batchItemFailures'])
        self.delivery.ses.send_email.assert_not_called()

    def test_legacy_ambiguous_record_needs_operator_check(self):
        self.send();self.item()['status']='SENDING'
        self.assertEqual(self.send()['statusCode'],409)
        self.delivery.ses.send_email.assert_not_called()

    def test_elapsed_timing_accepts_a_device_clock_different_from_aws(self):
        self.data['startedAt'] = int((time.time() + 7 * 86400) * 1000)
        self.data['elapsedMs'] = 10000
        self.assertEqual(self.send()['statusCode'], 202)

    def test_invalid_elapsed_timing_never_creates_an_enquiry(self):
        for value in [True, -1, 0, 1999, 86400001, '10000', float('nan'), float('inf')]:
            with self.subTest(value=value):
                self.assertEqual(self.send(self.event({**self.data,'elapsedMs':value}))['statusCode'],400)
        self.enquiry.queue.send_message.assert_not_called()
        self.assertFalse(self.table.items)

    def test_fifo_failure_returns_failed_and_all_unprocessed_records(self):
        records=[{'messageId':str(i),'body':json.dumps({'submissionId':str(i)})} for i in range(3)]
        with patch.object(self.delivery,'deliver',side_effect=[None,RuntimeError('Test failure')]) as send:
            result=self.delivery.handler({'Records':records},None)
        self.assertEqual(send.call_count,2)
        self.assertEqual(result,{'batchItemFailures':[{'itemIdentifier':'1'},{'itemIdentifier':'2'}]})


if __name__=='__main__':unittest.main()
