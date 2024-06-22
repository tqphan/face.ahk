import {
    computed,
    createApp,
    ref
} from "../../lib/Vue/vue.esm-browser.js";

import {
    FaceLandmarker,
    FilesetResolver,
    DrawingUtils
} from "../../lib/MediaPipe/vision_bundle.js";

// import {
//     compileExpression,
//     useOptionalChaining
// } from "../../lib/filtrex/filtrex.js";

import profile from "../../res/json/profiles.json" assert { type: "json" };
import item from "../../res/json/profile.item.json" assert { type: "json" };
import binding from "../../res/json/binding.json" assert { type: "json" };
import samples from "../../res/json/sample.json" assert { type: "json" };

const application = createApp({
    setup() {
        const app = ref({ modals: { name: "default" }, profiles: structuredClone(profile) });
        const mp = ref({ faceLandmarker: null, drawingUtils: null, results: structuredClone(samples), bs: {} });
        const predicting = ref(false);
        return {
            app, mp, predicting
        };
    },
    async mounted() {
        const ctx = this.$refs.output_canvas.getContext("2d");
        this.mp.drawingUtils = new DrawingUtils(ctx);
        this.loadProfiles();
        await this.init();
        this.$refs.input_video.requestVideoFrameCallback(this.predict);
    },
    computed: {
        hasProfiles() {
            if (this.app.profiles.items.length > 0)
                return true;
            else
                return false;
        },
        shouldDisabled() {
            return this.predicting
        }
    },
    methods: {
        async init() {
            const filesetResolver = await FilesetResolver.forVisionTasks(
                "../../lib/MediaPipe/wasm"
            );
            this.mp.faceLandmarker = await FaceLandmarker.createFromOptions(
                filesetResolver,
                {
                    baseOptions: {
                        modelAssetPath:
                            "../../lib/MediaPipe/face_landmarker.task",
                        delegate: "GPU"
                    },
                    outputFaceBlendshapes: true,
                    runningMode: "VIDEO",
                    numFaces: 1
                }
            );
            if (!this.mp.faceLandmarker) {
                console.log("Wait for faceLandmarker to load before clicking!");
                return;
            }
        },
        async predict() {
            const results = this.mp.faceLandmarker.detectForVideo(this.$refs.input_video, Date.now());
            const rect = this.$refs.output_canvas.parentNode.getBoundingClientRect();
            this.$refs.output_canvas.width = rect.width;
            this.$refs.output_canvas.height = rect.height;

            results?.faceBlendshapes[0]?.categories?.forEach((shape) => {
                this.mp.bs[shape.categoryName] = Math.round(shape.score * 100);
            });

            const value = this.app.profiles.selection;
            if (this.app.profiles.items.length > 0)
                this.processBindings(this.app.profiles.items[value].bindings, this.mp.bs);

            results?.faceLandmarks?.forEach(landmarks => {
                this.mp.drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#87D37C", lineWidth: 0.25 });
                this.mp.drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030" });
                this.mp.drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: "#FF3030" });
                this.mp.drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#00ffff" });
                this.mp.drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: "#00ffff" });
                this.mp.drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0" });
                this.mp.drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: "#3e32a8" });
                this.mp.drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, { color: "#FF3030" });
                this.mp.drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, { color: "#00ffff" });
            });

            this.$refs.input_video.requestVideoFrameCallback(this.predict);
        },
        toggleWebcam() {
            if (this.predicting) {
                let tracks = this.$refs.input_video.srcObject.getTracks();
                tracks.forEach(track => {
                    track.stop();
                });
            }
            else {
                const constraints = (window.constraints = {
                    audio: false,
                    video: true
                });

                navigator.mediaDevices
                    .getUserMedia(constraints)
                    .then(stream => {
                        this.$refs.input_video.srcObject = stream;
                    })
                    .catch(error => {
                        console.error(error);
                    });
            }
            this.predicting = !this.predicting;
        },
        testing() {
            console.log("69");
        },
        inputChanged(event) {
            const newValue = event.target.value;
            this.app.profiles.selection = newValue;
            console.log(newValue);
        },
        createProfile() {
            try {
                const i = structuredClone(item);
                i.name = this.app.modals.name;
                const b = structuredClone(binding);
                i.bindings.push(b);
                const count = this.app.profiles.items.push(i);
                this.app.profiles.selection = count - 1;
            } catch (error) {
                console.error(error);
            }

        },
        removeProfile() {
            try {
                this.app.profiles.items.splice(this.app.profiles.selection, 1);
                this.app.profiles.selection = this.app.profiles.selection - 1 < 0 ? 0 : this.app.profiles.selection - 1
            } catch (error) {
                console.error(error);
            }
        },
        createBinding() {
            try {
                const b = structuredClone(binding);
                this.app.profiles.items[this.app.profiles.selection].bindings.push(b)
            } catch (error) {
                console.error(error);
            }
            // console.log(this.selected)
        },
        removeBinding(index) {
            try {
                this.app.profiles.items[this.app.profiles.selection].bindings.splice(index, 1);
            } catch (error) {
                console.error(error);
            }
        },
        saveProfiles() {
            try {
                const parsed = JSON.stringify(this.app.profiles);
                localStorage.setItem('profiles', parsed);
            } catch (error) {
                console.error(error);
            }
        },
        loadProfiles() {
            if (localStorage.getItem('profiles')) {
                try {
                    this.app.profiles = JSON.parse(localStorage.getItem('profiles'));
                    this.resetProfiles();
                } catch (e) {
                    console.error(error);
                    localStorage.removeItem('profiles');
                    this.app.profiles = structuredClone(profile);
                }
            }
        },
        resetProfiles() {
            this.app.profiles.items.forEach((item) => {
                item.bindings.forEach((binding) => {
                    binding.started = false;
                    this.parseLogic(binding.start);
                    this.parseLogic(binding.stop);
                });
            });
        },
        parseLogic(item) {
            try {
                if (item.logic) {
                    const f = filtrex.compileExpression(item.logic, {
                        customProp: filtrex.useOptionalChaining
                    });
                    const ret = f(samples);
                    ret instanceof Error ? item.fn = null : item.fn = f;
                }
                else
                    item.fn = null;
            } catch (error) {
                console.error(error);
                item.fn = null;
            }
        },
        logicChanged(b) {
            this.parseLogic(b);
        },
        ffn(f, r) {
            const ret = f(r);
            if (ret instanceof Error)
                return false;
            else
                return ret;

        },
        processBindings(bindings, results) {
            //console.log(results);
            bindings?.forEach((binding) => {
                //start conditions
                if (binding.start.fn && this.ffn(binding.start.fn, results) && !binding.started) {
                    binding.started = true;
                    window.chrome.webview.postMessage(binding.start.ahk);
                    // console.log(binding.start.ahk);
                }
                else if (binding.stop.fn && this.ffn(binding.stop.fn, results) && binding.started) {

                    binding.started = false;
                    window.chrome.webview.postMessage(binding.stop.ahk);
                    // console.log(binding.stop.ahk);
                }
            });
        }
    }
    // watch: {
    //     'app.profiles': {
    //         handler: function (after, before) {
    //             //this.saveProfiles();
    //             // window.chrome.webview.postMessage("window.document.URL");
    //         },
    //         deep: true
    //     }
    // }
});

application.mount("#app");
