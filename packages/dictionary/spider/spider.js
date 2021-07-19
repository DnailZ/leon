import cheerio from "cheerio";
import { assert } from "console";
import fetch from 'node-fetch';
import fs from 'fs/promises';
import fs_sync from 'fs';
import lineReader from 'line-reader';
import { fail } from "assert";
import Denque from "denque";
import ProgressBar from 'progress';

function unwrap1(li, name) {
    if(li.length != 1) {
        throw {what: `${name} do not exists or exists for multiple times!`};
    }
    return li[0];
}

function unwrap1_or_null(li, name) {
    if(li.length > 1) {
        throw {what: `${name} exists for multiple times!`};
    }
    if(li.length == 1) {
        return li[0];
    } else {
        return null;
    }
}
function assert1(li, name) {
    if(li.length != 1) {
        throw {what: `${name} do not exists or exists for multiple times!`};
    }
    return li;
}

function text1_or_null(li, name) {
    if(li.length > 1) {
        throw {what: `${name} exists for multiple times!`};
    }
    if(li.length == 1) {
        return li.text();
    } else {
        return "";
    }
}
function unwrap1_or_more(li, name) {
    if(li.length == 0) {
        throw {what: `${name} not exists`};
    }
    return li[0];
}

function analysis_entry($, entry) {
    const header_dom = $("div.pos-header.dpos-h", entry);
    assert(header_dom.length >= 1); 
    const header = header_dom[0];
    const body =  unwrap1( $("div.pos-body", entry), "body");
    
    const pos = text1_or_null( $("div.posgram.dpos-g.hdib.lmr-5", header), "pos");

    const uk_pron_dom = $("span.uk.dpron-i", header);
    let uk_pron = analysis_pron($, uk_pron_dom);

    const us_pron_dom = $("span.us.dpron-i", header);
    let us_pron = analysis_pron($, us_pron_dom);
    if(us_pron && uk_pron) {
        if(us_pron.ipa == '' && uk_pron.ipa != '') {
            us_pron.ipa = uk_pron.ipa
        } else if(us_pron.ipa != '' && uk_pron.ipa == '') {
            uk_pron.ipa = us_pron.ipa
        }
    }

    const senses = $('div.pr.dsense', body).map((_, x) => analysis_sense($, x)).toArray();

    return { pos, uk_pron, us_pron, senses}
}

function analysis_pron($, pron) {
    if(pron.length == 0) {
        return null;
    }
    const urls = $('source', pron).map((_, x) => x.attribs['src']).toArray();
    var ipa = $('span.pron.dpron', pron).text();

    if(ipa == null){
        ipa = "";
    }
    return {urls, ipa}
}

function analysis_sense($, sense) {
    const header = unwrap1_or_null( $("h3.dsense_h", sense), "sense header");
    const body =  unwrap1( $("div.sense-body.dsense_b", sense), "sense body");

    var sense_sym = null;
    if(header) {
        let guideword = assert1( $(".guideword.dsense_gw", header), 'sense_sym');
        sense_sym = $('span', guideword).text();
    }

    const defs = $("div.def-block.ddef_block", body).map((_, x) => analysis_def($, x)).toArray();
    const phrases = $("div.pr.phrase-block.dphrase-block", body).map((_, x) => analysis_phrase($, x)).toArray();

    return {sense_sym, defs, phrases};
}

function analysis_def($, def) {
    const defination = assert1( $(".ddef_h", def), "defination").text();
    const translation = $($("span.trans.dtrans.dtrans-se.break-cj", def)[0]).text();

    const examples = $('div.examp.dexamp', def).map((_,x) => analysis_example($, x)).toArray();

    return {defination, translation, examples};
}

function analysis_example($, example) {
    const text = assert1($("span.eg.deg", example), 'example text').text();
    const translation = text1_or_null($("span.trans.dtrans.dtrans-se.hdb.break-cj", example), 'example translation');

    return {text, translation};
}


function analysis_phrase($, phrase) {
    const title = assert1( $(".phrase-title.dphrase-title", phrase), "phrase header").text();

    const defs = $("div.def-block.ddef_block", phrase).map((_, x) => analysis_def($, x)).toArray();

    return {title, defs};
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function lookup(word) {
    try {
        var response = null;
        var trying_times = 3;
        while(!response) {
            try{
                response = await fetch(`https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${word}`);
            } catch(e) {
                if(trying_times == 0) {
                    console.log(`Fetch Error: Reconnecting ${word}`);
                    return null;
                } else {
                    trying_times -= 1;
                }
            }
        }

        const text = await response.text();
        const $ = cheerio.load(text);

        const entries = $('div.pr.entry-body__el').map((_, x) => analysis_entry($, x)).toArray();
        return entries;
    } catch(e) {
        throw `${word}: ${e}`
    }
}

async function retrieve(word) {
    const page = await lookup(word);
    if(page && page.length > 0) {
        await fs.writeFile(`result/${word}`, JSON.stringify(page))
        return null
    }
    return word
}
async function retrieve_all(words) {

    let promises = new Denque(words.map((word) => retrieve(word)));
    var success = 0;
    while(promises.length > 0) {
        let ret = await promises.shift();
        if(ret) {
            promises.push(retrieve(ret));
        } else {
            success += 1;
            console.log(`success: ${success}`)
        }
    }
    return word
}
let main = async () => {
    if(fs_sync.existsSync('result')) {
        fs_sync.rmSync('result', {recursive: true});
    }
    await fs.mkdir('result')
    let file = await fs.readFile('freq');
    let words = file.toString().split('\n')
    words.pop();
    let base = 1000;
    let count = words.length / base;
    for(let i of Array(count).keys()) {
        console.log(`${i} of ${count}`);
        let buffer = words.slice(i * base, i * base + base);
        await retrieve_all(buffer)
        sleep(1000); // 休息1秒种
    }
};

main()

