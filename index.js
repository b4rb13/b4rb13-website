const input = document.getElementById("input");
const div = document.getElementById("div");
const helpText = document.getElementById("helpText");
const form = document.getElementById("form");

const lastCommand = (command) => `<pre>> ${command}</pre>`;

function _calculateAge(birthday) {
  // birthday is a date
  let ageDifMs = Date.now() - birthday.getTime();
  let ageDate = new Date(ageDifMs); // miliseconds from epoch
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function createDivWithContent(content) {
  let p = document.createElement("p");
  p.classList.add("text");
  p.innerHTML = lastCommand(input.value).concat(content);
  return p;
}
function createDivWithNotFound() {
  let p = document.createElement("p");
  p.classList.add("text");
  p.innerHTML = lastCommand(input.value).concat(lastCommand(input.value + ":"+ texts.notFound));
  return p;
}

function openLink(url) {
  window.open(url, "_blank");
}
const texts = {
  help: `<pre class="help">
    Hi there! I'm Derenik, welcome to my own commandline interface website, 
    these are common commands used in various situations:
    
          about         Show information about me
          
          resume        Show my resume
          
          clear         Clear the screen
          
          connect       Connect with me
          
          help          Show all the commands
          
          marvel        Say hello to marvel</pre>`,
  about: `Hi there! My name is Derenik. I am ${_calculateAge(
    new Date("1996-04-25")
  )} y/o JavaScript developer from Yerevan, Armenia. If you want to know about my work and technologies which I\'m using, just type "resume"`,
  contact: `You may contact with me via my e-mail address to@b4rb13.wtf, or using some social networks. Just type "connect --{network}", for example "connect --telegram". 
  <pre>
  This is a list of available communication channels:
    \n
    --facebook
    \n
    --github
    \n
    --instagram
    \n
    --linkedin
    \n
    --telegram
    \n
    --twitter
    \n
    --vk
  </pre>`,
  facebook: "https://www.facebook.com/Der.Khachatryan/",
  instagram: "https://instagram.com/derenik.khachatryan",
  telegram: "https://t.me/derkhachatryan",
  vk: "https://vk.com/der.khachatryan",
  linkedin: "https://linkedin.com/in/derenik-khachatryan/",
  twitter: "https://twitter.com/__b4rb13",
  github: "https://github.com/b4rb13",
  resume:
    "I'm working as a fullstack JavaScript developer with tremendous breadth experience in development single-page applications, responsive websites and Android/iOS mobile applications\n\nClient-side programming: HTML, CSS, JavaScript, React, Redux\nServer-side programming: Node.js, Express, GraphQL\nMobile development: Cordova, React Native\nDocument database: MongoDB\nServer-side administration: Heroku, Linux, Nginx\nProject-management: Git flow\nOther: Bot development (Telegram, Slack, FaceBook Messenger, etc.)\n\nIn my work I use the most advanced and high performance technologies like React.js library for building user interfaces, Redux for managing state of the application, Babel transplier for ensure the functionality of the application on various platforms. Also, I'm writing maintainable code\n\nI follow TDD methodology in order to ensure the stability of the application using Jest testing framework.\n\nI use Vim editor for development and work from an ArchLinux enviorenment",
  marvel: `<pre>
        ──────────────▐█████───────
        ──────▄▄████████████▄──────
        ────▄██▀▀────▐███▐████▄────
        ──▄██▀───────███▌▐██─▀██▄──
        ─▐██────────▐███─▐██───██▌─
        ─██▌────────███▌─▐██───▐██─
        ▐██────────▐███──▐██────██▌
        ██▌────────███▌──▐██────▐██
        ██▌───────▐███───▐██────▐██
        ██▌───────███▌──▄─▀█────▐██
        ██▌──────▐████████▄─────▐██
        ██▌──────█████████▀─────▐██
        ▐██─────▐██▌────▀─▄█────██▌
        ─██▌────███─────▄███───▐██─
        ─▐██▄──▐██▌───────────▄██▌─
        ──▀███─███─────────▄▄███▀──
        ──────▐██▌─▀█████████▀▀────
        ──────███──────────────────
</pre>`,
notFound: ' command not found'
};

function checkCommand(e) {
  e.preventDefault();
  let value = e.target[0].value;
  switch (value.toLowerCase().trim()) {
    case "help":
      div.appendChild(createDivWithContent(texts.help));
      break;
    case "about":
      div.appendChild(createDivWithContent(texts.about));
      break;
    case "connect":
      div.appendChild(createDivWithContent(texts.contact));
      break;
    case "resume":
      div.appendChild(createDivWithContent(texts.resume));
      break;
    case "clear":
      div.innerHTML = "";
      helpText.innerHTML = "";
      break;
    case "marvel":
      div.appendChild(createDivWithContent(texts.marvel));
      break;
    case "connect --instagram":
      openLink(texts.instagram);
      break;
    case "connect --vk":
      openLink(texts.vk);
      break;
    case "connect --facebook":
      openLink(texts.facebook);
      break;
    case "connect --twitter":
      openLink(texts.twitter);
      break;
    case "connect --github":
      openLink(texts.github);
      break;
    case "connect --linkedin":
      openLink(texts.linkedin);
      break;
    case "connect --telegram":
      openLink(texts.instagram);
      break;
      default: 
      div.appendChild(createDivWithNotFound())
  }
  input.value = "";
}

form.addEventListener("submit", checkCommand);
document.addEventListener("click", () => {
  input.focus();
});
