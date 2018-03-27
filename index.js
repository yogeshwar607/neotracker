const rp = require('request-promise');
const fs = require('fs');
const json2csv = require('json2csv');
const co = require('co');
const _ = require('lodash');
const clui = require('clui');
const Progress = clui.Progress;

function initRequest(first, after) {
    return new Promise((resolve, reject) => {
        const url = 'https://neotracker.io/graphql';
        const options = {
            method: 'POST',
            uri: url,
            body: [{
                "id": "25",
                "variables": {
                    "first": first,
                    "after": after
                }
            }],
            json: true // Automatically stringifies the body to JSON
        }

        rp(options)
            .then(function (parsedBody) {
                // POST succeeded...
                if (first === 0 && after === 0) {
                    const count = parsedBody[0] && parsedBody[0].data && parsedBody[0].data.addresses ? parsedBody[0].data.addresses.count : 0;
                    resolve(count);
                }
                const edges = parsedBody[0] && parsedBody[0].data && parsedBody[0].data.addresses && parsedBody[0].data.addresses.edges && parsedBody[0].data.addresses.edges.length ? parsedBody[0].data.addresses.edges : [];
                resolve(edges);
            })
            .catch(function (err) {
                // POST failed...
                console.log(err);
                reject(err)
            });
    })
}

function* init() {
    try {
        let data = [];
        const count = yield initRequest(0, 0);
        const iterations = Math.ceil(count / 9999);
        let thisProgressBar = new Progress(iterations);
        for (var i = 0; i < iterations; i++) {
            console.log(thisProgressBar.update(i, iterations));
            const edges = yield initRequest(9999, 9999 * i);
            data = [...data, ...edges];
        }
        const fields = ['node.hash', 'node.confirmed_coins.edges[0].node.value']
        let csv = json2csv({
            data: data,
            fields: fields
        });
        const filename = `file${Date.now()}.csv`;
        fs.writeFile(filename, csv, function (err) {
            if (err) throw err;
            console.log(`file saved with name - ${filename}`);
        })
    } catch (e) {
        console.log(`error in generating file -${e}`);
        throw e;
    }
}

function handler() {
    co(init())
        .then(() => {
            console.log('done successfully');
        })
        .catch((err) => {
            console.log('error in setting global variables', err);
        })
}

handler();