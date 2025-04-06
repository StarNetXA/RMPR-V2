import fs from 'fs'
import path from 'path'
import archiver from 'archiver'
import got from 'got'
import prettier from 'prettier'
import { LOGGER } from './LOGGER.js';
import {fingerprint} from '../lib/hashlib.js'

export async function Curseforge(mcv,modloader,mlver,mpver,sf,pathx,mpname,mpdes) {
    //初始化ZIP
    const zipfile = fs.createWriteStream(
        `${mpname}-${mpver}[${mcv}-${modloader}].zip`
    );
    const archive = archiver("zip", {
        zlib: { level: 0 },
    });
    //初始化空数组
let jtmp = [];
let tmp = []; //指纹数组
let rtmp = [];
//Mods Hash查询
for (let a = 0; a < fs.readdirSync(`${pathx}\\mods`).length; a++) {
    if (fs.statSync(`${`${pathx}\\mods`}\\${fs.readdirSync(`${pathx}\\mods`)[a]}`).isFile()){
        try {
            const test = path.resolve(`${pathx}\mods\\${fs.readdirSync(`${pathx}\\mods`)[a]}`)
            jtmp.push({[a]:test}) //什么鸡巴push json
            tmp.push(await fingerprint(path.resolve(`${`${pathx}\\mods`}\\${fs.readdirSync(`${pathx}\\mods`)[a]}`)))
        } catch (error) {
            LOGGER.error({err:error})
        }
    } 
}
const resjson = await got.post('https://api.curseforge.com/v1/fingerprints/432',{
    headers :{
"x-api-key":"$2a$10$ydk0TLDG/Gc6uPMdz7mad.iisj2TaMDytVcIW4gcVP231VKngLBKy",
"User-Agent":"RMPR/2.0.0 Mozilla/5.0 AppleWebKit/537.36 Chrome/63.0.3239.132 Safari/537.36",
    },
    json:{"fingerprints": tmp}
}).json()
const positions = tmp.filter(item => !new Set(resjson.data.exactFingerprints).has(item)).map(item => tmp.indexOf(item)); //排除已有指纹
for(let c=0;c<resjson.data.exactFingerprints.length;c++){
    const result = resjson.data.exactMatches.find(item => item.file.fileFingerprint === resjson.data.exactFingerprints[c]);
    rtmp.push({"projectID": result.file.modId,"fileID": result.file.id,"required": true})
  }
const latestjson = JSON.stringify({"minecraft": {"version": mcv,"modLoaders": [{"id": `${modloader}-${mlver}`,"primary": true}]},"manifestType": "minecraftModpack","manifestVersion": 1,"name": mpname,"version": mpver,"author": mpdes,"files": rtmp, "overrides": "overrides"})
archive.append(prettier.format(latestjson,{parser:"json-stringify"}) , { //压缩元数据
name: `manifest.json`,
});
////本地处理
for (let i = 0; i < sf.length; i++) { //文件夹处理
    if (fs.statSync(sf[i]).isFile()) {
      //文件
      archive.append(fs.createReadStream(sf[i]), {
        name: `overrides/${path.basename(sf[i])}`,
      });
    } else if (fs.statSync(sf[i]).isDirectory()) {
      //文件夹
      archive.directory(sf[i], `overrides/${path.basename(sf[i])}`);
    }
  }
    for(let b=0;b<positions.length;b++){
           archive.append(fs.readFileSync(`${`${pathx}\\mods`}\\${fs.readdirSync(`${pathx}\\mods`)[b]}`), {
            name: `overrides/mods/${path.basename(jtmp[positions[b]][positions[b]])}`,
        });
    }
  ////压缩到curseforge的zip
  archive.pipe(zipfile);
  zipfile.on("close", () => {
    LOGGER.info("Curseforge打包完成！共"+archive.pointer()+"bytes")
  });
  await archive.finalize(); //完成
}
