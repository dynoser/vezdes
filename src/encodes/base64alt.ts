/// <reference path="./custom.d.ts" />

import AltBase64 from "./altbase64";

// Optional import code:
/*
let AltBase64: any;
class AltBase64stub {
  static decodeNum64Arr(arr: number[], isAlt64: boolean): Uint8Array {
    return new Uint8Array(arr);
  }
}
try {
  const AltBase64Module = require("./altbase64");
  AltBase64 = AltBase64Module.default || AltBase64Module;
} catch(error) {
  AltBase64 = AltBase64stub;
}
*/

/* VEZDES:
 :PUBKEY: aOk1rVVhWoaYZzThCNWiaBMGeaQMJ_hAZT-HTGfZkKY
 :URL: https://raw.githubusercontent.com/dynoser/vezdes/main/src/base64alt.ts
 :HASH: dDszYtVORkHeZMH3NZ0q_lxKlU7KupN2s3WEtHsyGr8
 :TIME:  1709909446
 :SIGNATURE: f3AnghMOmy1FpaKYB8TwBOlRYVvIbUZMapZgDWJJha8xq8l0Xy-YSLrCaoIA7JHvm5d4wW8mJZp7SPZnmRWeAg
# /VEZDES */

export default class base64alt
{
  public static base64cs: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  public static base64cn: { [char: string]: number } = {}; // [char] => num64 + 1
  public static urlMode: boolean = true;
  public static splitWidth: number = 0; // split result to lines by width

  public static canAlt64Decode = false;

  public static stdInited: boolean = false;

  public static initStd(): void {
    base64alt.stdInited = true;
    for (let p = 0; p < 64; p++) {
      base64alt.base64cn[base64alt.base64cs[p]] = p + 1;
    }
    base64alt.base64cn['+'] = 62 + 1;
    base64alt.base64cn['/'] = 63 + 1;

    // if (AltBase64.hasOwnProperty('default')) {
    //   AltBase64 = AltBase64.default;
    // }
    base64alt.canAlt64Decode = ('decode' in AltBase64);
  }

  public static num64ToBase64(
    arr: number[],
    isAlt64: boolean,
    urlMode: boolean = true,
    splitWidth: number = 0
  ): string {
    const out: string[] = isAlt64 ? ['='] : [];
    const base64cs = urlMode ? base64alt.base64cs : base64alt.base64cs.substring(0, 62) + '+/';
    for(const num64 of arr) {
      out.push(base64cs[num64]);
    }
    if (!urlMode && !isAlt64) {
      while(out.length % 4) {
        out.push('=');
      }
    }
    return (splitWidth > 0) ? base64alt.implodeSplitter(out, splitWidth) : out.join('');
  }

  private static implodeSplitter(out: string[], splitWidth: number = 0): string {
    const arr: string[] = out.join('').match(new RegExp(`.{1,${splitWidth}}`, 'g')) || [];
    return arr.join('\n');
  }

  public static decodeToUint8Arr(b64: string): Uint8Array {
    const len: number = b64.length;
    const isAlt64: boolean = b64.startsWith('=');
    if (!base64alt.stdInited) {
      base64alt.initStd();
    }

    const arr: number[] = [];
    for (let p = (isAlt64 ? 1 : 0); p < len; p++) {
      if (base64alt.base64cn[b64[p]]) {
        arr.push(base64alt.base64cn[b64[p]] - 1);
      }
    }

    if (isAlt64 && !base64alt.canAlt64Decode) {
      throw new Error("AltBase64 decoder not available or disabled");
    }

    return AltBase64.decodeNum64Arr(arr, isAlt64);
  }
    
  public static Num64ArrToUint8Arr(num64Arr: number[], padNum64: number = 51): Uint8Array {
    let len = num64Arr.length;
    const sub: number = len % 4; // 0, 1, 2, 3
    if (padNum64 && (sub & 1)) {
      // if 1 or 3 (skip 0 and 2)
      num64Arr.push(padNum64);
      len++;
    }

    let out: Uint8Array = new Uint8Array(3 * Math.ceil(len / 4));
    let i = 0;
    let j = 0;

    while (i < len) {
      const o1: number = num64Arr[i++];
      const o2: number = i < len ? num64Arr[i++] : 0;
      const o3: number = i < len ? num64Arr[i++] : 0;
      const o4: number = i < len ? num64Arr[i++] : 0;

      const bits: number = (o1 << 18) | (o2 << 12) | (o3 << 6) | o4;

      out[j++] = (bits >> 16) & 0xFF;
      out[j++] = (bits >> 8) & 0xFF;
      out[j++] = bits & 0xFF;
    }

    if (padNum64 && (len % 4 === 2)) { // remove last element
      out = out.slice(0, -1);
    }
    if (!padNum64) {
      switch(len % 4) {
        case 3:
          out = out.slice(0, -1);
          break;
        case 2:
          out = out.slice(0, -2);
          break;
      }
    }

    return out;
  }

  public static Uint8ArrToNum64Arr(uint8arr: Uint8Array, dropEnd: number = 1): number[] {
    const len = uint8arr.length;
    let out: number[] = [];
    let i = 0;
    while (i < len) {
        const o1: number = uint8arr[i++];
        const o2: number = i < len ? uint8arr[i++] : 0;
        const o3: number = i < len ? uint8arr[i++] : 0;
        const bits: number = (o1 << 16) | (o2 << 8) | o3;
        out.push((bits >> 18) & 0x3F);
        out.push((bits >> 12) & 0x3F);
        out.push((bits >>  6) & 0x3F);
        out.push((bits)       & 0x3F);
    }
    switch (len % 3) { 
      case 1:
          out = out.slice(0, -2 - dropEnd);
          break;
      case 2:
          out = out.slice(0, -1 - dropEnd);
          break;
    }
    return out;
  }

  public static Uint8ArrToTextUTF8(Uint8Arr: Uint8Array): string {
    const textDecoder = new TextDecoder('utf-8');
    const utf8String = textDecoder.decode(Uint8Arr);
    return utf8String;
  }

  public static encodeRaw(data: string, urlMode: boolean = false): string {
    const uint8arr: Uint8Array = new Uint8Array(new TextEncoder().encode(data));
    return base64alt.encodeUint8Arr(uint8arr, urlMode);
  }

  public static encodeUint8Arr(uint8arr: Uint8Array, urlMode: boolean = false): string {
    let B64: string;
    if (typeof Buffer !== 'undefined') {
      B64 = Buffer.from(uint8arr).toString(urlMode ? 'base64url' : 'base64');
      if (base64alt.splitWidth > 0) {
        B64 = base64alt.implodeSplitter([B64], base64alt.splitWidth);
      }
    } else {
      const num64arr: number[] = base64alt.Uint8ArrToNum64Arr(uint8arr, 0);
      B64 = base64alt.num64ToBase64(num64arr, false, urlMode, base64alt.splitWidth);
    }
    return B64;
  }

  public static decodeRaw(data: string): string {
    const uint8arr: Uint8Array = base64alt.decodeToUint8Arr(data);
    return base64alt.Uint8ArrToTextUTF8(uint8arr);
  }
}