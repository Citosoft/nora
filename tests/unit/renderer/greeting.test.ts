import assert from "node:assert/strict";
import test from "node:test";
import { getGreetingFirstName } from "@/components/app/logic/thread-workspace/greeting";

test("chat greetings use only the first name and preserve its spelling", () => {
  assert.equal(getGreetingFirstName("Daniel Smith"), "Daniel");
  assert.equal(getGreetingFirstName("  Élodie\tMartin  "), "Élodie");
  assert.equal(getGreetingFirstName("Mary-Jane Watson"), "Mary-Jane");
  assert.equal(getGreetingFirstName("李明"), "李明");
});

test("chat greetings handle single or missing names", () => {
  assert.equal(getGreetingFirstName("Daniel"), "Daniel");
  assert.equal(getGreetingFirstName(""), "");
  assert.equal(getGreetingFirstName(" \n\t "), "");
});
