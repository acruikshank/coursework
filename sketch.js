function setup() {
  var body = document.body;
  createCanvas(body.offsetWidth, body.offsetHeight);
  colorMode(HSB, 100);
  noStroke();
}

function draw() {
  fill(20,100,100);
  ellipse(400, 200, 200, 200);

}
