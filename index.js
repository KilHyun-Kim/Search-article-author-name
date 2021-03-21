// axios : URL을 호출하여 웹페이지 HTML을 그대로 가져와 Promise 형태로 반환하는 모듈입니다. https://github.com/axios/axios
// cheerio :  HTML DOM 형태의 데이터에서 원하는 내용을 쉽게 추출할 수 있게 해주는 기능을 가진 모듈
const express = require("express");
const app = express();
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

let authorsArray = [];
let candidateName = [];
let realArray = [];
let sevenCaseArray;
let resultString;
function getEngName(korName) {
  delay(300).then(function () {
    const api_url =
      "https://openapi.naver.com/v1/krdict/romanization?query=" +
      encodeURI(korName);
    const request = require("request");
    const options = {
      url: api_url,
      headers: {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_password,
      },
    };
    request.get(options, function (err, response, body) {
      if (!err && response.statusCode == 200) {
        const nameObj = JSON.parse(body).aResult[0].aItems;
        for (let i = 0; i < nameObj.length; i++) {
          const place = nameObj[i].name.indexOf(" ");
          const firstName = nameObj[i].name.slice(0, place).toLowerCase();
          const secondName = nameObj[i].name
            .slice(place + 1, nameObj[i].name.length)
            .toLowerCase();
          const result = secondName + firstName;
          candidateName.push(result);
        }
      } else {
        console.log("error = " + response.statusCode);
      }
    });
  });
}
function getHTML(url) {
  return new Promise((resolve) => {
    delay(300).then(function () {
      axios.get(url).then(function (data) {
        resolve(data);
      });
    });
  });
}
function delay(ms) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve();
    }, ms);
  });
}

/* 논문의 중복일 경우 사용할 함수 */
// 논문 이름을 넣으면 해당 논문의 논문 번호를 return 함
let paperNumberArray = [];
function getNumber(paperName) {
  getHTML(`https://pubmed.ncbi.nlm.nih.gov/?term=${paperName}`).then((html) => {
    let testObj = {};
    const $ = cheerio.load(html.data);
    const items = $("body").find(".docsum-title");
    const paperDetail = $(".authors-list").find(".full-name").text();
    // 상세 페이지가 나왔을 경우 ( 바로 논문 페이지로 이동했을 경우,)
    if (paperDetail !== "") {
      console.log("논문 검색 결과 1개");
      authorsArray.push(getAuthors(paperName));
    } else {
      console.log("논문 검색 결과 2개 이상");
      for (let i = 1; i < items.length; i++) {
        const number = (testObj["number"] = $("body").find(".docsum-title")[
          i
        ].attribs.href);
        const sliceNumber = number.slice(1, number.length - 1);
        paperNumberArray.push(sliceNumber);
      }
      for (let j = 0; j < paperNumberArray.length; j++) {
        const testArray = getAuthors(paperNumberArray[j]);
        authorsArray.push(testArray);
      }
    }
  });
}
/*
   논문 Detail 페이지에서 논문의 author값을 갖고오는 함수,
   -- 논문이 단수 일 경우 바로 사용할 함수  
   -- 논문의 이름을 검색 했을 때 논문 상세 페이지로 이동할 경우 사용할 함수  
 */
// 논문 번호를 넣으면 해당 페이지로 이동해서 논문 저자를 긁어온다.
function getAuthors(paperNumber) {
  let cuteArray = [];
  getHTML(`https://pubmed.ncbi.nlm.nih.gov/?term=${paperNumber}`).then(
    (html) => {
      const $ = cheerio.load(html.data);
      // 왜 items 가 논문 저자 이름 * 2 값의 length 를 갖지?   << 추가 작업 필요//////////////////////////////////////////////////////////////////////////////
      const items = $(".authors-list").find(".full-name");
      for (let i = 0; i < items.length / 2 - 1; i++) {
        const authors = $(".authors-list").find(".full-name")[i].children[0]
          .data;
        cuteArray.push(authors);
      }
    }
  );
  return cuteArray;
}
// 논문 이름 넣기
getNumber(
  "Prognosis after wedge resection in patients with 8th edition TNM stage IA1 and IA2 non-small cell lung cancer"
);
// 의사 이름 넣기
getEngName("김은성");

const makeCase = (arr) => {
  const splitArray = [arr[2], arr[0], arr[1]];
  const basicCase =
    splitArray[0] + "," + " " + splitArray[1] + " " + splitArray[2];
  const firstCase = splitArray[0] + "," + " " + splitArray[1].slice(0, 1);
  const secondCase =
    splitArray[0] +
    "," +
    " " +
    splitArray[1].slice(0, 1) +
    " " +
    splitArray[2].slice(0, 1);
  const thirdCase =
    splitArray[0] +
    "," +
    " " +
    splitArray[1].slice(0, 1) +
    "-" +
    splitArray[2].slice(0, 1);
  const fourthCase =
    splitArray[0] + "," + " " + splitArray[1] + "-" + splitArray[2];
  const fifthCase = splitArray[0] + "," + " " + splitArray[1] + splitArray[2];

  sevenCaseArray = [
    basicCase,
    firstCase,
    secondCase,
    thirdCase,
    fourthCase,
    fifthCase,
  ];
};
/** 3/21 다음 작업 > 해당 sevenCaseArray 배열의 원소를 전체 논문의 FAU 검색하여 Pubmed 전체 논문 파일에서 검색하여 해당 값들만 따로 모아서 파일로 만듬  */
setTimeout(() => {
  console.log("이름 경우의 수", candidateName);
  console.log("----------------------------------------");
  console.log("해당 논문 저자 이름 목록", authorsArray);
  console.log("----------------------------------------");
  for (let k = 0; k < authorsArray.length; k++) {
    for (let l = 0; l < authorsArray[k].length; l++) {
      for (let m = 0; m < candidateName.length; m++) {
        if (
          candidateName[m] ===
          authorsArray[k][l]
            .replace("-", "")
            .replace(/(\s*)/g, "")
            .toLowerCase()
        ) {
          if (authorsArray[k][l].indexOf("-") > 0) {
            const splitValue = authorsArray[k][l].split(/[\-\" "]/);
            makeCase(splitValue);
          } else {
            const splitValue = authorsArray[k][l].split(" ");
            makeCase(splitValue);
          }

          /** 논문에서 사용하는 이름 결과값 만들기 */
          if (authorsArray[k][l].split(" ").length === 2) {
            const reArrange =
              authorsArray[k][l].split(" ")[1] +
              "," +
              " " +
              authorsArray[k][l].split(" ")[0];
            resultString = reArrange;
          } else if (authorsArray[k][l].split(" ").length === 3) {
            const reArrange =
              authorsArray[k][l].split(" ")[2] +
              "," +
              " " +
              authorsArray[k][l].split(" ")[0] +
              " " +
              authorsArray[k][l].split(" ")[1];
            resultString = reArrange;
          }
          break;
        }
      }
    }
  }
  if (resultString) {
    console.log("논문에서 사용하는 이름 결과", resultString);
  } else {
    console.log(
      "네이버 이름 번역기와 논문에서 사용하는 이름 매칭되지 않음 -> 직접 찾아야함"
    );
  }
  console.log("----------------------------------------");
  if (Array.isArray(sevenCaseArray)) {
    console.log("해당 논문 이름의 경우의수 ", sevenCaseArray);
  } else {
    console.log("경우의 수를 찾을 수 없음 -> 직접 찾아야함");
  }
}, 13000);

// 있는 예시 Significance of Increased Rapid Treatment from HIV Diagnosis to the First Antiretroviral Therapy in the Recent 20 Years and Its Implications: the Korea HIV/AIDS Cohort Study
// getAuthors(31623426);
// getNumber(
//   "Significance of Increased Rapid Treatment from HIV Diagnosis to the First Antiretroviral Therapy in the Recent 20 Years and Its Implications: the Korea HIV/AIDS Cohort Study"
// );
// function main(){

// }
