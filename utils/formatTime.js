module.exports = (timeSecs) => {
  timeSecs = Math.floor(timeSecs);

  const days = Math.floor(timeSecs / 86400);
  const hours = Math.floor((timeSecs % 86400) / 3600);
  const minutes = Math.floor((timeSecs % 3600) / 60);
  const seconds = timeSecs % 60;

  let result = [];
  if (days > 0) result.push(`${days} day(s)`);
  if (hours > 0 || days > 0) result.push(`${hours} hours`);
  if (minutes > 0 || hours > 0 || days > 0) result.push(`${minutes} minutes`);
  result.push(`${seconds} seconds`);

  return result.join(' ');
};
