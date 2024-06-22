import { FaceLandmarker, FilesetResolver, DrawingUtils } from "../../lib/MediaPipe/vision_bundle.js";
import {
    createApp,
    ref
  } from "../../lib/Vue/vue.esm-browser.js";
  
  function startDrawing() {
    var video = document.querySelector('video');
    var canvas = document.querySelector('canvas');
    var ctx = canvas.getContext('2d');

    var paint_count = 0;
    var start_time = 0.0;

    var updateCanvas = function (now) {
        if (start_time == 0.0)
            start_time = now;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        var elapsed = (now - start_time) / 1000.0;
        var fps = (++paint_count / elapsed).toFixed(3);
        document.querySelector('#fps_text').innerText = 'video fps: ' + fps;

        video.requestVideoFrameCallback(updateCanvas);
    }

    video.requestVideoFrameCallback(updateCanvas);

    video.src = "./elephants-dream.webm"
    video.play()
}
startDrawing();