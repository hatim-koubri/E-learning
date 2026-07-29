import {describe,expect,it} from "vitest";
import {formatBytes} from "@/lib/formations";
describe("formatage des ressources",()=>{
 it("formate les tailles en unités lisibles",()=>{
  expect(formatBytes()).toBe("");
  expect(formatBytes(512)).toBe("512 o");
  expect(formatBytes(1536)).toBe("1.5 Ko");
  expect(formatBytes(2*1024*1024)).toBe("2.0 Mo");
 });
});
