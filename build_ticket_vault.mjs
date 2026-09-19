#!/usr/bin/env node
import fs from "fs";
import path from "path";
import crypto from "crypto";
import readline from "readline";

const pagesRoot=process.cwd();
const sourceDir=path.resolve(process.argv[2] || "../travel-handbook-cloudflare/private-ticket-repo/tickets");
const outDir=path.join(pagesRoot,"vault");

function askHidden(prompt){
  return new Promise((resolve,reject)=>{
    if(!process.stdin.isTTY){
      reject(new Error("需要在交互式终端运行，或设置环境变量 TICKET_VAULT_PASSWORD"));
      return;
    }
    process.stdout.write(prompt);
    let value="";
    const onData=buf=>{
      const s=buf.toString("utf8");
      for(const ch of s){
        if(ch==="\u0003"){cleanup();process.exit(130);}
        if(ch==="\r"||ch==="\n"){cleanup();process.stdout.write("\n");resolve(value);return;}
        if(ch==="\u007f"){
          if(value.length){value=value.slice(0,-1);}
          continue;
        }
        value+=ch;
        process.stdout.write("•");
      }
    };
    const cleanup=()=>{
      process.stdin.off("data",onData);
      try{process.stdin.setRawMode(false);}catch{}
      process.stdin.pause();
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data",onData);
  });
}

function prettyNameFromSuffix(file){
  const b=path.basename(file,path.extname(file));
  const pairs=[
    ["qu-dandan","Qu Dandan"],
    ["li-ziyang","Li Ziyang"]
  ];
  for(const [suffix,name] of pairs){
    if(b.endsWith(suffix))return name;
  }
  return "";
}

function metaFor(file){
  const n=file.toLowerCase();
  const who=prettyNameFromSuffix(file);
  const x=(date,country,category,title,note="")=>({date,country,category,title,note});
  if(n.includes("jungfraujoch-seat-reservation"))
    return x("2026-09-21","瑞士","少女峰","少女峰座位预约"+(who?` · ${who}`:""));
  if(n.includes("jungfraujoch-2026-09-21"))
    return x("2026-09-21","瑞士","少女峰","少女峰往返票"+(who?` · ${who}`:""));
  if(n.includes("night-train-antibes-paris"))
    return x("2026-09-27","法国","夜车","Antibes → Paris 夜车票"+(who?` · ${who}`:""));
  if(n.includes("carte-avantage"))
    return x("2026-09-27","法国","SNCF","Carte Avantage Adulte"+(who?` · ${who}`:""),"检票时备用");
  if(n.includes("louvre"))
    return x("2026-09-28","巴黎","景点","Louvre Museum（卢浮宫）门票");
  if(n.includes("versailles"))
    return x("2026-09-29","巴黎","景点","Palace of Versailles（凡尔赛宫）门票");
  if(n.includes("bateaux-mouches"))
    return x("2026-09-29","巴黎","游船","Bateaux-Mouches（塞纳河游船）票");
  if(n.includes("sainte-chapelle"))
    return x("2026-09-30","巴黎","景点","Sainte-Chapelle（圣礼拜堂）门票");
  if(n.includes("eiffel"))
    return x("2026-09-30","巴黎","景点","Eiffel Tower（埃菲尔铁塔）门票");
  if(n.includes("sbb-luggage"))
    return x("2026-09-19","瑞士","行李","SBB 行李寄送凭证","9/22 Zürich Flughafen 取回行李时备用");
  if(n.includes("interdiscount"))
    return x("2026-09-19","瑞士","取货凭证","Interdiscount Genève Aéroport 可领取确认");
  if(n.includes("hotel-chalet-swiss"))
    return x("2026-09-19","瑞士","住宿","Hotel Chalet Swiss（瑞士小屋酒店）预订确认");
  const clean=path.basename(file,path.extname(file)).replaceAll("-"," ").replaceAll("_"," ");
  return x("","其他","凭证",clean);
}

function mimeFor(file){
  const e=path.extname(file).toLowerCase();
  if(e===".pdf")return "application/pdf";
  if(e===".png")return "image/png";
  if(e===".jpg"||e===".jpeg")return "image/jpeg";
  return "application/octet-stream";
}

function encryptBuffer(buf,key){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv("aes-256-gcm",key,iv);
  const enc=Buffer.concat([cipher.update(buf),cipher.final()]);
  const tag=cipher.getAuthTag();
  return Buffer.concat([iv,enc,tag]);
}

if(!fs.existsSync(sourceDir)){
  console.error(`找不到票据目录：${sourceDir}`);
  process.exit(1);
}

let password=process.env.TICKET_VAULT_PASSWORD||"";
if(!password){
  password=await askHidden("设置旅行票夹密码：");
  const again=await askHidden("再次输入密码：");
  if(password!==again){console.error("两次密码不一致");process.exit(2);}
}
if(password.length<12){
  console.error("密码至少需要 12 个字符。建议使用中文/英文单词 + 数字的长密码。");
  process.exit(3);
}

fs.rmSync(outDir,{recursive:true,force:true});
fs.mkdirSync(outDir,{recursive:true});

const salt=crypto.randomBytes(16);
const iterations=310000;
const key=crypto.pbkdf2Sync(password,salt,iterations,32,"sha256");

const files=fs.readdirSync(sourceDir)
  .filter(x=>[".pdf",".png",".jpg",".jpeg"].includes(path.extname(x).toLowerCase()))
  .sort();

const tickets=[];
const encryptedPaths=[];
let seq=1;
for(const file of files){
  const src=path.join(sourceDir,file);
  const id=`t${String(seq).padStart(3,"0")}`;
  const encName=`${id}.enc`;
  const encPath=`./vault/${encName}`;
  const raw=fs.readFileSync(src);
  fs.writeFileSync(path.join(outDir,encName),encryptBuffer(raw,key));
  const meta=metaFor(file);
  tickets.push({
    id,
    ...meta,
    mime:mimeFor(file),
    path:encPath
  });
  encryptedPaths.push(encPath);
  seq++;
}

const manifest=Buffer.from(JSON.stringify({
  version:1,
  generated_at:new Date().toISOString(),
  tickets
}),"utf8");
const manifestPath="./vault/manifest.enc";
fs.writeFileSync(path.join(outDir,"manifest.enc"),encryptBuffer(manifest,key));

const config={
  version:1,
  algorithm:"PBKDF2-SHA256 + AES-256-GCM",
  salt:salt.toString("base64"),
  iterations,
  manifest:manifestPath,
  files:encryptedPaths
};
fs.writeFileSync(path.join(outDir,"config.json"),JSON.stringify(config,null,2)+"\n","utf8");

console.log(`\n已生成 ${tickets.length} 份加密票据：${outDir}`);
console.log("密码没有写入任何文件。");
console.log("接下来可执行：git add . && git commit && git push");
