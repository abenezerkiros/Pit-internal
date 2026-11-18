import test from "node:test";
import assert from "node:assert/strict";
import { matchClient, normalizeClientName } from "../src/lib/client-desk/match-client";
test("full names match despite titles, case, and spacing", () => {
 const profiles = [{id:"1",fullName:"Robert Neal"},{id:"2",fullName:"Byron Bright"}];
 assert.equal(matchClient("Mr Robert Neal",profiles).clientId,"1");
 assert.equal(matchClient("Mr.Byron Bright",profiles).clientId,"2");
 assert.equal(matchClient("  ROBERT   NEAL  ",profiles).clientId,"1");
 assert.equal(normalizeClientName("Mrs. Jane Doe"),"jane doe");
 assert.equal(normalizeClientName("Drew Smith"),"drew smith");
});
test("no profiles, unknown names and ambiguous names remain unlinked", () => {
 assert.equal(matchClient("Alex Example",[]).clientId,"");
 assert.equal(matchClient("Alex",[{id:"1",fullName:"Alex Example"}]).status,"unmatched");
 assert.equal(matchClient("Dr. Alex Example",[
  {id:"1",fullName:"Alex Example"},{id:"2",fullName:"Mr. Alex Example"}
 ]).status,"ambiguous");
});
test("group passengers and greeters are not linked to an individual by guessing", () => {
 const profiles=[{id:"1",fullName:"Jane Doe"}];
 assert.equal(matchClient("Jane Doe and John Doe",profiles).clientId,"");
 assert.equal(matchClient("Greeter Jane Doe",profiles).clientId,"");
});
