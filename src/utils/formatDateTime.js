

  // 将时间戳转换为 YYYY-MM-DD HH:mm:ss 格式
  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;

    // 如果是当天，只返回时间
    if (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    ) {
      return timeStr;
    }

    // 如果是本年本月，返回月日和时间
    if (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    ) {
      const day = String(date.getDate()).padStart(2, '0');
      return `${date.getMonth() + 1}-${day} ${timeStr}`;
    }

    // 如果是本年，不显示年份
    if (date.getFullYear() === now.getFullYear()) {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}-${day} ${timeStr}`;
    }

    // 其他情况显示完整日期时间
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} ${timeStr}`;
  }
export default formatDateTime
