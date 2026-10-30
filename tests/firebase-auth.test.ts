import assert from 'node:assert/strict';
import {test} from 'node:test';
import {OAuth2Client} from 'google-auth-library';
test('Google authentication headers remain enumerable for Firestore REST transport',async()=>{
  const client=new OAuth2Client();
  client.setCredentials({access_token:'firestore-header-contract-test',expiry_date:Date.now()+600000});
  const headers=await client.getRequestHeaders();
  assert.equal({...headers}.Authorization,'Bearer firestore-header-contract-test');
});