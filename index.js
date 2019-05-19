const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const md5 = require('js-md5');
const fs = require('fs');
const difflib = require('difflib');
const stateDir = `${__dirname}/tmp/`;

pages = [
  ["https://stortinget.no/no/Stottemeny/Stilling-ledig/", ".jobbnorge-joblist-table"],
  ["https://stortinget.no/no/Saker-og-publikasjoner/Sporsmal/Skriftlige-sporsmal-og-svar/Skriftlig-sporsmal/?qid=74380", "#main-content"],
  ["https://www.smalhans.no/matogvin", '.menu-block'],
  ["https://www.digitalocean.com/legal/privacy-policy/", ".www-Section"]
];

async function getElementFromURL(url, selector) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0' });
  const bodyHandle = await page.$('body');
  const html = await page.evaluate(body => body.innerHTML, bodyHandle);
  const $ = cheerio.load(html);
  const selected = $(selector);

  if (!selected) {
    console.log(`Selector ${selector} not found at ${url}`);
    return;
  }

  if (selected.length > 1) {
    console.log(`Found multiple items with selector ${selector} at ${url}. Selecting first.`);
  }

  await bodyHandle.dispose();
  await browser.close();
  return $(selected[0]).html();
}

(async () => {
  for (let page of pages) {
    const url = page[0];
    const selector = page[1];
    const identifier = md5.hex(`${url}${selector}`);
    const fileName = `${stateDir}${identifier}.txt`;

    const htmlNew = await getElementFromURL(url, selector);

    // can't get content
    if (!htmlNew) continue;

    // save new input and continue, we will check diff next time
    if (!fs.existsSync(fileName)) {
      fs.writeFileSync(fileName, htmlNew);
      continue;
    }

    const htmlOld = fs.readFileSync(fileName, 'utf-8');

    diff = difflib.unifiedDiff(
      htmlOld.split('\n'),
      htmlNew.split('\n')
    );

    let diffOutput = null;
    if (diff.length > 3) {
      diff.splice(0, 3);
      diffOutput = diff.join('\n');
    }

    if (diffOutput) {
      console.log(` ***** ${url} ***** `);
      console.log(`\n${diffOutput}\n`);
      fs.writeFileSync(fileName, htmlNew)
    }
  }
  process.exit();
})()
