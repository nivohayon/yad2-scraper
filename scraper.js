const cheerio = require("cheerio");
const Telenode = require("telenode-js");
const fs = require("fs");
const config = require("./config.json");
const getYad2Response = require("./getYad2Html");
require("dotenv").config();

const scrapeItemsAndExtractUrls = async (url) => {
  // Get Yad2 HTML.
  const yad2Html = await getYad2Response(url);
  if (!yad2Html) {
    throw new Error("Could not get Yad2 response");
  }
  const $ = cheerio.load(yad2Html);

  // Check if the page is a captcha page.
  const title = $("title");
  const titleText = title.first().text();
  if (titleText === "ShieldSquare Captcha") {
    throw new Error("Bot detection");
  }

  // Find all feed items.
  const $feedItems = $(
    '[data-nagish="feed-item-list-box"][data-testid="item-basic"]'
  );
  if (!$feedItems) {
    throw new Error("Could not find feed items");
  }

  // Extract item URLs.
  const itemUrls = [];
  $feedItems.each((_, elm) => {
    const itemUrl = $(elm).find("a").attr("href");
    if (itemUrl) {
      // Resolve URLs
      const absoluteUrl = itemUrl.startsWith("http")
        ? itemUrl
        : new URL(itemUrl, "https://www.yad2.co.il").toString();
      itemUrls.push(absoluteUrl);
    }
  });
  return itemUrls;
};

// If maxPages === 0, scrape until an empty page is encountered (all pages)
const scrapeAllPagesAndExtractImgUrls = async (baseUrl, maxPages = 0) => {
  const allItemsUrls = [];
  let page = 1;
  while (true) {
    const pageUrl = page === 1 ? baseUrl : `${baseUrl}&page=${page}`;
    const pageItemsUrls = await scrapeItemsAndExtractUrls(pageUrl);
    // Stop if a subsequent page returns no items
    if (page > 1 && pageItemsUrls.length === 0) {
      break;
    }
    allItemsUrls.push(...pageItemsUrls);
    // When maxPages > 0, stop after reaching that page number
    if (maxPages > 0 && page >= maxPages) {
      break;
    }
    page++;
  }
  return allItemsUrls;
};

const checkIfHasNewItem = async (itemUrls, topic) => {
  const filePath = `./data/${topic}.json`;
  let savedUrls = [];
  try {
    savedUrls = require(filePath);
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      fs.mkdirSync("data", { recursive: true });
      fs.writeFileSync(filePath, "[]");
    } else {
      console.log(e);
      throw new Error(`Could not read / create ${filePath}`);
    }
  }
  let shouldUpdateFile = false;
  savedUrls = savedUrls.filter((savedUrl) => {
    shouldUpdateFile = true;
    return itemUrls.includes(savedUrl);
  });
  const newItems = [];
  itemUrls.forEach((url) => {
    if (!savedUrls.includes(url)) {
      savedUrls.push(url);
      newItems.push(url);
      shouldUpdateFile = true;
    }
  });
  if (shouldUpdateFile) {
    const updatedUrls = JSON.stringify(savedUrls, null, 2);
    fs.writeFileSync(filePath, updatedUrls);
  }
  return newItems;
};

const scrape = async (topic, url) => {
  const apiToken = process.env.TELEGRAM_API_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const telenode = new Telenode({ apiToken });
  try {
    await telenode.sendTextMessage(`Scanning ${topic} ...`, chatId);
    const scrapeImgResults = await scrapeAllPagesAndExtractImgUrls(
      url,
      config.maxPages
    );
    const newItems = await checkIfHasNewItem(scrapeImgResults, topic);
    if (newItems.length > 0) {
      const newItemsJoined = newItems.join("\n----------\n");
      const msg = `${newItems.length} new items:\n${newItemsJoined}`;
      await telenode.sendTextMessage(msg, chatId);
    } else {
      await telenode.sendTextMessage(
        `No new items were added for topic ${topic}`,
        chatId
      );
    }
  } catch (e) {
    let errMsg = e?.message || "";
    if (errMsg) {
      errMsg = `Error: ${errMsg}`;
    }
    await telenode.sendTextMessage(
      `Scan workflow failed... 😥\n${errMsg}`,
      chatId
    );
    throw new Error(e);
  }
};

const main = async () => {
  for (let i = 0; i < config.projects.length; i++) {
    const project = config.projects[i];
    if (project.disabled) {
      console.log(`Topic "${project.topic}" is disabled. Skipping.`);
      continue;
    }
    await scrape(project.topic, project.url);
  }
};

main();
