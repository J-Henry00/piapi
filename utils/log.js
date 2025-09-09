module.exports = (msg) => {
  const timeString = new Date().toLocaleString();

  console.log(`[${timeString}] ${msg}`);
  return;
};
