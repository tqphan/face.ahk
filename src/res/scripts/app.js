import {
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



import profile from "../json/empty.profile.json" with { type: "json" };
import item from "../json/empty.item.json" with { type: "json" };
import binding from "../json/empty.binding.json" with { type: "json" };
import samples from "../json/blendshapes.samples.json" with { type: "json" };
import userProfile from "../json/user.profile.json" with { type: "json" };

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
            let results;
            const time = performance.now();
            try {
                results = this.mp.faceLandmarker.detectForVideo(this.$refs.input_video, time);
            } catch (error) {
                console.error(error);
                this.$refs.input_video.requestVideoFrameCallback(this.predict);
                return;
            }
            const rect = this.$refs.output_canvas.parentNode.getBoundingClientRect();
            this.$refs.output_canvas.width = rect.width;
            this.$refs.output_canvas.height = rect.height;

            results?.faceBlendshapes[0]?.categories?.forEach((shape) => {
                this.mp.bs[shape.categoryName] = Math.round(shape.score * 100);
            });

            const value = this.app.profiles.selection;
            if (this.app.profiles.items.length > 0)
                this.processBindings(this.app.profiles.items[value].bindings, this.mp.bs, time);

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
                const parsed = JSON.stringify(this.app.profiles, null, '\t');
                localStorage.setItem('profiles', parsed);
               ahk.SaveProfile(parsed);
                // console.log(parsed);
                // console.log(localStorage.getItem('profiles'));
            } catch (error) {
                console.error(error);
            }
        },
        loadProfiles() {
            if (localStorage.getItem('profiles')) {
                try {
                    this.app.profiles = userProfile;
                    // this.app.profiles = JSON.parse(localStorage.getItem('profiles'));
                    this.resetProfiles();
                    console.log(this.app.profiles);
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
                    binding.start.time = 0;
                    binding.start.activated = false;
                    binding.stop.time = 0;
                    binding.stop.activated = true;
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
        processBinding(binding, results, time) {
            // Check if binding function is valid
            const validity = binding.fn && this.ffn(binding.fn, results);

            if (validity) {
                // Only process if not already activated
                if (!binding.activated) {
                    if (binding.debounce) {
                        // For debounced bindings
                        if (!binding.time) {
                            // First trigger - start the timer
                            binding.time = time;
                        } else if (time - binding.time > binding.debounce) {
                            // Debounce period elapsed - activate
                            window.chrome.webview.postMessage(binding.ahk);
                            binding.activated = true;
                        }
                    } else {
                        // Immediate activation for non-debounced bindings
                        window.chrome.webview.postMessage(binding.ahk);
                        binding.activated = true;
                    }
                }
            } else {
                // Reset when condition is no longer met
                binding.activated = false;
                binding.time = 0;
            }

            return binding.activated;
        },
        processBindings(bindings, results, time) {
            bindings?.forEach((binding) => {
                // if(!binding.started) {
                //     binding.started = this.processBinding(binding.start, results, time)
                // }
                // else {
                //     binding.started = this.processBinding(binding.stop, results, time);
                // }
                this.processBinding(binding.start, results, time);
                this.processBinding(binding.stop, results, time);
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
