// 3/24 solves drag and drops, but can only guess

console.log("S: script loaded");

let botEnabled = null;
let responseMap = {}

window.botEnabled = botEnabled;

// updates the chrome storage with the given question and answer
function updateMapData(question, answers) {
  if (!(question in responseMap)) {
    chrome.storage.local.get('responseMap', (result) => {
      const tempResponseMap = result.responseMap || {};
      tempResponseMap[question] = answers;
      chrome.storage.local.set({ responseMap: tempResponseMap }, () => {
        console.log('Data updated in local storage:', tempResponseMap);
        responseMap = tempResponseMap; // Update the responseMap in the content script
      });
    });
  }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// drag and drop section
async function simulateDragAndDrop(source, target) {
  const rect1 = source.getBoundingClientRect();
  const rect2 = target.getBoundingClientRect();

  const mousedown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect1.left + rect1.width / 2,
      clientY: rect1.top + rect1.height / 2,
  });

  const mouseup = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect2.left + rect2.width / 2,
      clientY: rect2.top + rect2.height / 2,
  });

  source.dispatchEvent(mousedown);
  await sleep(800);

  for (let i = 1; i <= 50; i++) {
      const intermediateX = rect1.left + (rect2.left - rect1.left) * (i / 50) + rect1.width / 2;
      const intermediateY = rect1.top + (rect2.top - rect1.top) * (i / 50) + rect1.height / 2;

      const mousemove = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: intermediateX,
          clientY: intermediateY,
      });

      source.dispatchEvent(mousemove);
      await sleep(10);
  }
  const finalMouseMove = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect2.left + rect2.width / 2,
      clientY: rect2.top + rect2.height / 2,
  });
  source.dispatchEvent(finalMouseMove);
  await sleep(500);
  target.dispatchEvent(mouseup);
  await sleep(200)
}

// begin solver.js

function readQuestionAndResponses() {
  console.log("read questions and responses")
  let question = "";
  let responses = [];

  // Find the question
  let questionElement = document.getElementsByClassName("prompt");
  if (questionElement) {
    const paragraphElement = questionElement[0].querySelector('p');
    const textNodes = [...paragraphElement.childNodes].filter(node => node.nodeType === Node.TEXT_NODE);
    question = textNodes.map(node => node.textContent).join('_____');
  }

  // Find the potential responses
  let responseElements = document.getElementsByClassName("air-item-container")[0].getElementsByClassName("choiceText rs_preserve");
  if (responseElements.length) {
    for (let i = 0; i < responseElements.length; i++) {
      responses.push(responseElements[i].textContent);
    }
  }

  return { question, responses, responseElements };
}

async function selectCorrectResponse(question, responses, responseElements) {
  await sleep(100);
  console.log("select correct responses")
  let checkIfNextButton = document.getElementsByClassName("next-button-container")[0];
  if (checkIfNextButton != null) {
    console.log("next button exists")
    // if review concept button
    let nextButtonCheck = document.getElementsByClassName("next-button-container")[0].getElementsByTagName("button")[0];
    let reviewConceptButtonCheck = document.querySelector('[data-automation-id="lr-tray_reading-button"]');
    if (nextButtonCheck.hasAttribute('disabled')) {
      console.log("read about concept clicking")
      if (reviewConceptButtonCheck) {
        reviewConceptButtonCheck.click();
      } else {
        console.warn("Read About the Concept button not found");
      }
      await sleep(1000);
      let continueButton = document.querySelector('[data-automation-id="reading-questions-button"]');
      if (continueButton) {
        continueButton.click();
      } else {
        console.warn("To Questions button not found");
      }
    }
    await sleep(1000);
    nextButtonCheck.click();

    document.getElementsByClassName("next-button-container")[0].getElementsByTagName("button")[0].click();
    return;
  }


  let answerButton = document.getElementsByClassName("confidence-buttons-container")[0].getElementsByTagName("button")[0];
  let correctResponse = responseMap[question];
  // if answer is already stored
  if (correctResponse) {
    console.log("Answer found:", correctResponse);
    // if fill in the blank
    if (responseElements.length == 0) {
      let blanks = document.getElementsByClassName("input-container span-to-div");
      for (let x = 0; x < blanks.length; x++) {
        let inputTag = blanks[x].getElementsByTagName("input")[0];
        inputTag.focus();
        document.execCommand('insertText', false, correctResponse[x]);
      }
    }

    // if multiple choice
    for (let i = 0; i < responses.length; i++) {
      if (correctResponse.includes(responses[i])) {
        responseElements[i].click();
      }
    }
    await sleep(Math.random() * 200 + 500);
    // document.querySelector('button.btn-confidence').removeAttribute('disabled');
    answerButton.click();

  // answer is not already stored -> guess
  } else {
    let isFillInBlankQuestion = false;
    let isDragAndDrop = false;

    // is fill in the blank question or drag and drop
    if (responseElements[0] == null) {

      // if drag and drop, end
      if (document.getElementsByClassName("match-single-response-wrapper")[0] != null) {
        //TODO: implement drag and drop
        isDragAndDrop = true;
        console.log("Trying to solve drag and drop question")
        await sleep(500);
        let choices = document.querySelectorAll('.choices-container .choice-item-wrapper .content p');
        let drop = document.querySelectorAll('.-placeholder.choice-item-wrapper');
        let numDrops = 0;
        while (drop.length > 0) {
          console.log("Executing drag and drop: ", numDrops);
          await simulateDragAndDrop(choices[0], drop[0]);
          await sleep(1000)
          choices = document.querySelectorAll('.choices-container .choice-item-wrapper .content p');
          drop = document.querySelectorAll('.-placeholder.choice-item-wrapper');
          await sleep (2000)
          numDrops += 1;
          if (numDrops > 6) {
            console.log("Giving up drag and drop");
            return;
          }
        }
      } else {
        isFillInBlankQuestion = true;
        let blanks = document.getElementsByClassName("input-container span-to-div");
        for (let x = 0; x < blanks.length; x++) {
          let inputTag = blanks[x].getElementsByTagName("input")[0];
          inputTag.focus();
          document.execCommand('insertText', false, "IDK");
        }
      }
    } else {
      responseElements[0].click();
    }

    // submit answer
    await sleep(Math.random() * 200 + 500);
    document.querySelector('button.btn-confidence').removeAttribute('disabled');
    answerButton.click();

    await sleep(Math.random() * 100 + 800)
    // store the correct answer into the responseMap
    let answers = [];
    if (isFillInBlankQuestion) {
      let answerElements = document.getElementsByClassName("correct-answers")

      for (let x = 0; x < answerElements.length; x++) {
        answers.push(answerElements[x].getElementsByClassName("correct-answer")[0].textContent.replace(/,/g, '').split(" ")[0]);
      }

      // not fill in the blank question
    } else {
      if (isDragAndDrop) {
        //TODO: store answers for drag and drop.
        return;
      }
      let answerElements = document.getElementsByClassName("answer-container")[0].getElementsByClassName("choiceText rs_preserve");
      // if true/false
      if (answerElements.length == 0) {
        answerElements = document.getElementsByClassName("answer-container");
      }
      for (let i = 0; i < answerElements.length; i++) {
        answers.push(answerElements[i].textContent);
      }
    }
    // responseMap[question] = answers;
    updateMapData(question, answers)
    console.log("Stored answer:", responseMap[question])
  }

  // move on to next question
  await sleep(Math.random() * 200 + 600);
  let nextButton = document.getElementsByClassName("next-button-container")[0].getElementsByTagName("button")[0];
  let reviewConceptButton = document.querySelector('[data-automation-id="lr-tray_reading-button"]');
  if (nextButton.hasAttribute('disabled')) {
    if (reviewConceptButton) {
      reviewConceptButton.click();
    } else {
      console.warn("Read About the Concept button not found");
    }
    await sleep(1000);
    let continueButton = document.querySelector('[data-automation-id="reading-questions-button"]');
    if (continueButton) {
      continueButton.click();
    } else {
      console.warn("To Questions button not found");
    }
  }
  await sleep(500);
  nextButton.click();
}

// Main function that reads the question and responses and selects the correct response
async function answerQuestion() {
  let { question, responses, responseElements } = readQuestionAndResponses();
  await selectCorrectResponse(question, responses, responseElements);
}

let answerQuestionRunning = false;
async function activateBot() {
  console.log("S: Activating Bot");
  if (botEnabled === null) {
    botEnabled = true;
    while (botEnabled) {
      if (!answerQuestionRunning) {
        answerQuestionRunning = true;
        try {
          await answerQuestion();
        } catch (error) {
          console.error("Error while answering question:", error);
        }
        answerQuestionRunning = false;
      }
      await sleep(Math.random() * 200 + 600);
    }
  }
}

function deactivateBot() {
  console.log("S: Deactivating Bot");
  botEnabled = null;
}

// listen for messages from the popup to enable/disable the bot
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("the request:", request, "done");
  if (request == "activate") {
    activateBot();
  }
  if (request == "deactivate") {
    deactivateBot();
  }
});

//listen for messages from highlighter.js to update responseMap
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateMapData') {
    const receivedData = message.data;
    console.log('S: Received data from H:', receivedData);
  }
});
