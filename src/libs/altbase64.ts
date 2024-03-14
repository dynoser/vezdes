/// <reference path="../libs/custom.d.ts" />

import base64alt from './base64alt';

let zlib: typeof import('zlib') = require('zlib');
const canZlib = zlib.hasOwnProperty('deflateSync');
let pako: typeof import('pako') = !canZlib ? require('pako') : undefined;
const canPako = !canZlib && pako.hasOwnProperty('deflate');

export default class AltBase64
{
  public static gzEnabled = true;

/* VEZDES:
 :PUBKEY: aOk1rVVhWoaYZzThCNWiaBMGeaQMJ_hAZT-HTGfZkKY
 :URL: https://raw.githubusercontent.com/dynoser/vezdes/main/src/libs/altbase64.ts
 :HASH: JXCJiBp1f9D_xeOFlQdxBOtNGqAwuhCCUILA4SPQ3ag
 :TIME:  1710426924
 :SIGNATURE: 2rilLh2Xk_uNUpRmFSs92JWfilE7PR1BmqcGWzTwiPZiTWo1qhjWJLYQGkPoAGqF3hQhRC6_FAWVntEHQep0DQ
 :EMPL:  0
# /VEZDES */

//  public static base64cs: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
//  public static base64cn: { [char: string]: number } = {}; // [char] => num64 + 1
//  public static urlMode: boolean = true;

  public static keys4Arr: string[] = []; // [enLow, enUpc, ruLow, ruUpc]

  public static charSet: { [key: string]: number[] } = {}; // [enLow => [pos-number => unicode-number]]
  public static charSetSrc: { [key: string]: string } = {
    'enLow': 'a b c d e f g h i j k l m n o p q r s t u v w x y z $ \' { } = @  ! ? . , : ; - + / * " ( )',
    'enUpc': 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z $ \' { } = @  ^ ~ [ ] \\ | _ & % # ` < >',
    'ruLow': 'а б с д е ф ж н и й к л м п о р я г щ т ю в щ х у з ъ ь ы э ц ч ё ! ? . , : ; - + / * " ( )',
    'ruUpc': 'А Б С Д Е Ф Ж Н И Й К Л М П О Р Я Г Щ Т Ю В Ш Х У З Ъ Ь Ы Э Ц Ч Ё ^ ~ [ ] \\ | _ & % # ` < >',
  };

  public static fromChToNum64: { [key: string]: { [char: string]: number } } = {}; // uniChar => num64+1

  public static allCharsRU: { [char: string]: number } = {}; // [utfChar] => num64;

  public static altInited: boolean = false;

  public static init(): void {
    AltBase64.altInited = true;
    for (const currKey in AltBase64.charSetSrc) {
      const str = AltBase64.charSetSrc[currKey] + '       0 1 2 3 4 5 6 7 8 9';
      AltBase64.keys4Arr.push(currKey);
      AltBase64.fromChToNum64[currKey] = {};
      const chArr = str.split(' ');
      const charSetArr: number[] = []; // pos-number => unicode-number

      chArr.forEach((utfChar, n) => {
        let uniCode = 0;
        if (utfChar !== '') {
          AltBase64.fromChToNum64[currKey][utfChar] = n + 1;
          uniCode = utfChar.charCodeAt(0);
          if (uniCode > 127) {
            AltBase64.allCharsRU[utfChar] = uniCode;
          }
        }
        charSetArr.push(uniCode);
      });

      AltBase64.fromChToNum64[currKey][' '] = 62 + 1;
      AltBase64.fromChToNum64[currKey]['\n'] = 63 + 1;
      charSetArr.push(32); // 62 => space
      charSetArr.push(10); // 63 => \n
      if (charSetArr.length !== 64) {
        throw new Error("Charset init error");
      }

      AltBase64.charSet[currKey] = charSetArr;
    }

    if (!base64alt.stdInited) {
      base64alt.initStd();
    }

    if (AltBase64.gzEnabled && !canZlib && !canPako) {
      AltBase64.gzEnabled = false;
    }
  }

  public static encode(data: string): string {
    const uint8arr = new Uint8Array(new TextEncoder().encode(data));
    return AltBase64.encodeUint8Arr(uint8arr);
  }

  public static encodeUint8Arr(uint8arr: Uint8Array): string {
    const b64stdLen = Math.ceil(uint8arr.length / 3) * 4;
    let arr = AltBase64.encodeBytes(uint8arr);
    const isAlt64 = arr.length < b64stdLen;
    if (! isAlt64) {
      arr = base64alt.Uint8ArrToNum64Arr(uint8arr);
    }
    if (AltBase64.gzEnabled && (canZlib || canPako)) {
      const noGzLen = (arr.length / 4) * 3;
      const tmpGzBuff = canZlib ? zlib.deflateRawSync(uint8arr, {
        level: zlib.constants.Z_BEST_COMPRESSION
      }) : pako.deflate(uint8arr, { level: 9, windowBits: -15 });

      if (tmpGzBuff && tmpGzBuff.length < noGzLen) {
          let outUi8Arr = new Uint8Array(tmpGzBuff.length + 1);
          outUi8Arr[0] = 197;
          outUi8Arr.set(tmpGzBuff, 1);
          arr = base64alt.Uint8ArrToNum64Arr(outUi8Arr, 0);
      }
    }
    return base64alt.num64ToBase64(arr, isAlt64, base64alt.urlMode, base64alt.splitWidth);
  }


  public static encodeBytes(uint8arr: Uint8Array): number[] {
    AltBase64.altInited || AltBase64.init();
    const out: number[] = [];
    let currKey = 'enLow';
    const len = uint8arr.length;

    let prevUp1 = -1;
    
    for(let i = 0; i < len; i++){
      let uniChar = String.fromCharCode(uint8arr[i]);
      const cn = uint8arr[i];
  
      if (cn < 32) {
        if (cn === 10) {
            out.push(63); // EOL
        } else {
            out.push(48); // en
            out.push(cn + 32);
        }
        continue;
      } else if (cn > 126) {
          // utf-8 RU or bytes
          let charIsRu = false;
          if (cn > 207 && cn < 210 && len > i + 1) {
            const uniCode = (uint8arr[i] & 0x1F) << 6 | (uint8arr[i + 1] & 0x3F);
            uniChar = String.fromCharCode(uniCode);

            if (AltBase64.allCharsRU[uniChar]) {
                i++;
                charIsRu = true;
            }
          }
          if (!charIsRu) {
              if (cn === 127) {
                  out.push(48); // en
                  out.push(42); // 32 + 10
              } else if (cn > 191) {
                  out.push(47); // b192+
                  out.push(cn - 192);
              } else {
                  out.push(46); // b128+
                  out.push(cn - 128);
              }
              continue;
          }
      }
  
      if (AltBase64.fromChToNum64[currKey][uniChar]) {
          out.push(AltBase64.fromChToNum64[currKey][uniChar]-1);
          prevUp1 = -1;
          continue;
      }
  
      // try find in other keys
      const whereKeysArr: { [key: number]: string } = {};
      let currKeyNum: number = 0;
      for (let keyNum = 0; keyNum < AltBase64.keys4Arr.length; keyNum++) {
          const key = AltBase64.keys4Arr[keyNum];
          if (key === currKey) {
              currKeyNum = keyNum;
              continue;
          }
          if (AltBase64.fromChToNum64[key][uniChar]) {
              whereKeysArr[keyNum] = key;
          }
      }
      
      let c = Object.keys(whereKeysArr).length;

      if (c) {
        let newKeyNum: number = currKeyNum;
        // key found
        if (c === 2) {
          if (whereKeysArr[1] !== undefined && whereKeysArr[3] !== undefined) {
            if (currKeyNum & 2) {
              // current is RU - remove 1 (en)
              delete whereKeysArr[1];
            } else {
              // current is en - remove 3 (ru)
              delete whereKeysArr[3];
            }
            c = 1;
          } else if (whereKeysArr[0] !== undefined && whereKeysArr[2] !== undefined) {
            if (currKeyNum & 2) {
              // current is RU - remove 0 (en)
              delete whereKeysArr[0];
            } else {
              // current is en - remove 2 (ru)
              delete whereKeysArr[2];
            }
            c = 1;
          } else if (whereKeysArr[0] !== undefined && whereKeysArr[1] !== undefined) {
            if (currKeyNum & 1) {
              // current is Upc
              delete whereKeysArr[0];
            } else {
              // current is Low
              delete whereKeysArr[1];
            }
            c = 1;
          } else {
            throw new Error("Unexpected");
          }
        }
        if (c === 1) {
          newKeyNum = Number(Object.keys(whereKeysArr)[0]);
          const changedNum = newKeyNum ^ currKeyNum;
          
          if (changedNum & 1) {
            if (currKeyNum & 1) {
              // current is UP-case, will changed to lowerCase
              if (prevUp1 < 0) {
                out.push(49); // ctrl 7 low
              } else {
                out[prevUp1]--; // change CAPS (51) to UP1 (50)
              }
            } else {
              // current is lower-case, will be changed to UP
              prevUp1 = out.length;
              out.push(51); // ctrl 5 caps
            }
          }
          
          if (changedNum & 2) {
              if (currKeyNum & 2) {
                  // current is RU, will be changed to EN
                  out.push(48); // ctrl 4 en
              } else {
                  // current is EN, will be changed to RU
                  out.push(32); // ctrl 1 ru
              }
          }

          currKey = whereKeysArr[newKeyNum];
          out.push(AltBase64.fromChToNum64[currKey][uniChar]-1);
        } else {
          throw new Error("Unexpected");
        }
      }
    }
    return out;
  }

  public static decode(b64: string): string {
    const decodeArr: Uint8Array = base64alt.decodeToUint8Arr(b64);
    return base64alt.Uint8ArrToTextUTF8(decodeArr);
  }


  static decodeNum64Arr(num64arr: number[], isAlt64: boolean): Uint8Array {
    const len = num64arr.length;
    if (isAlt64 && len && num64arr[0] === 49) {
      const uint8arr = base64alt.Num64ArrToUint8Arr(num64arr);
      switch(uint8arr[0]) {
        case 197: { // 49 << 2 + 1
          return canZlib ? zlib.inflateRawSync(uint8arr.slice(1)) : pako.inflate(uint8arr.slice(1), {windowBits: -15});
        }
        case 196: { // 49 << 2 + 0
          return uint8arr.slice(1);
        }
      }
    }
    if (isAlt64 && !AltBase64.altInited) {
      AltBase64.init();
    }
    return isAlt64 ? AltBase64.decodeBytes(num64arr) : base64alt.Num64ArrToUint8Arr(num64arr, 0);
  }
    
  public static decodeBytes(num64arr: number[]): Uint8Array {
    let currKey: string = 'enLow';
    let lang: string = 'en';
    let mode: string = 'Low';
    let up1: boolean = false;
    const maxPos: number = num64arr.length - 1;
    const out: number[] = [];

    for(let currPos = 0; currPos <= maxPos; currPos++) {
      const num64 = num64arr[currPos];
      switch (num64) {
      case 46: // b128+
        if (currPos < maxPos) {
          out.push(num64arr[++currPos] + 128);
        }
        break;
      case 47: // b192+
        if (currPos < maxPos) {
          out.push(num64arr[++currPos] + 192);
        }
        break;
      case 48: // en+
        if (currPos < maxPos && num64arr[currPos + 1] > 31) {
          const bNum = num64arr[++currPos] - 32;
          out.push(bNum);
          break;
        }
        if (lang === 'ru') {
          lang = 'en';
          currKey = lang + mode;
        }
        break;
      case 49: // low
        mode = 'Low';
        currKey = lang + mode;
        break;
      case 50: // up1
        mode = 'Upc';
        currKey = lang + mode;
        up1 = true;
        break;
      case 51: // CAPS
        mode = 'Upc';
        currKey = lang + mode;
        up1 = false;
        break;
      case 32: // ru (only if en)
        if (lang === 'en') {
          lang = 'ru';
          currKey = lang + mode;
          break;
        }
      default:
        const uniCode: number = AltBase64.charSet[currKey][num64];
        if (uniCode < 128) {
          out.push(uniCode);
        } else {
          const byte1 = 0xc0 | ((uniCode & 0x7c0) >> 6);
          const byte2 = 0x80 | (uniCode & 0x3f);
          out.push(byte1, byte2);
        }
        if (up1) {
          up1 = false;
          mode = 'Low';
          currKey = lang + mode;
        }
      }
    }
    return new Uint8Array(out);
  }
}
  