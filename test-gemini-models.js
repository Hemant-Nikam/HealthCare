const apiKey = "AIzaSyAaR_P8Cesnw3-iOWYUN2FCrT7t4KUNyyk";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(url)
  .then(res => res.json())
  .then(data => {
      console.log(data.models.map(m => m.name));
  })
  .catch(console.error);
