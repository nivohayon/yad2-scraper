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

module.exports = getYad2HTML;
