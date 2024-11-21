export default function constructGraphData(dataType, data) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const weeks = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];

  let graphData = [];

  switch (dataType) {
    case "month": {
      graphData = months.map((month, index) => ({
        month,
        revenue: 0,
      }));
      data.forEach((item) => {
        const monthIndex = item.month - 1; // MongoDB month is 1-indexed
        if (monthIndex >= 0 && monthIndex < months.length) {
          graphData[monthIndex].revenue = item.revenue;
        }
      });
      return graphData;
    }
    case "week": {
      const dayMapping = {
        1: "Sun",
        2: "Mon",
        3: "Tue",
        4: "Wed",
        5:"Thu",
        6: "Fri",
        7: "Sat",
      };

      graphData = weeks.map((week) => ({
        week,
        revenue: 0,
      }));
      data.forEach((item) => {

        const dayName = dayMapping[item.day];
        const dayIndex = weeks.indexOf(dayName);
        if (dayIndex !== -1) {
          graphData[dayIndex].revenue = item.revenue;
        }
      });
      return graphData;
    }
  }
}
