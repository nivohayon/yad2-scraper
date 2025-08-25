const getYad2HTML = async (url) => {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
    });
    return await res.text();
  } catch (err) {
    console.log(err);
  }
};

const getItemIdFromUrl = (url) => {
  return url.split("/item/")[1].split("?")[0] ?? "";
};

module.exports = { getYad2HTML, getItemIdFromUrl };
