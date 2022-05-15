const fs = require("fs");

export async function writeLogs(logname: string, data: any) {
    if (logname === "" && data === "") {
      fs.appendFileSync("./logs/logs.txt", "\n");
      return;
    }

    const toWrite =
      "[" +
      JSON.stringify(+new Date()) +
      "]" +
      ` ${logname}: ` +
      JSON.stringify(data) +
      "\n";
  
    fs.appendFileSync("./logs/logs.txt", toWrite);
    console.log(logname, data);
    return;
  }