import {
    createApp,
    ref
} from "../../lib/Vue/vue.esm-browser.js";

import {
    FaceLandmarker,
    FilesetResolver,
    DrawingUtils
} from "../../lib/MediaPipe/vision_bundle.js";

import empty from "../json/empty.profile.json" with { type: "json" };
import item from "../json/empty.item.json" with { type: "json" };
import binding from "../json/empty.binding.json" with { type: "json" };
import samples from "../json/blendshapes.samples.json" with { type: "json" };
import profiles from "../json/user.profiles.json" with { type: "json" };
import settings from "../json/user.settings.json" with { type: "json" };
import translations from "../json/translations.json" with { type: "json" };

const json = { settings, translations };

const application = createApp({
    setup() {
        const app = ref({ modals: { name: "default" }, profiles: structuredClone(empty) });
        const mediapipe = ref({ faceLandmarker: null, drawingUtils: null, results: structuredClone(samples), bs: {} });
        const predicting = ref(false);
        const settings = ref(structuredClone(json.settings));
        const translations = ref(structuredClone(json.translations));
        return {
            app, mp: mediapipe, predicting, settings, translations
        };
    },
    async mounted() {
        const ctx = this.$refs.output_canvas.getContext("2d");
        this.mp.drawingUtils = new DrawingUtils(ctx);
        this.applyTheme();
        this.loadSettings();
        this.loadProfiles();
        this.$refs.input_video.requestVideoFrameCallback(this.predict);
        await this.init();
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
            if (this.settings["auto.start.prediction"]) {
                this.toggleWebcam();
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
        applyTheme() {
            document.body.setAttribute('data-bs-theme', this.settings.theme);
        },
        testing() {
            console.log("69");
        },
        loadSettings() {
            try {
                this.settings = json.settings;
            } catch (error) {
                console.error(error);
                this.settings = structuredClone(settings);
            }
        },
        saveSettings() {
            const parsed = JSON.stringify(this.settings, null, '\t');
            ahk.SaveSettings(parsed);
        },
        profileChanged(event) {
            const value = event.target.value;
            this.app.profiles.selection = value;
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
                // localStorage.setItem('profiles', parsed);
                ahk.SaveProfiles(parsed);
            } catch (error) {
                console.error(error);
            }
        },
        loadProfiles() {
            try {
                this.app.profiles = profiles;
                this.resetProfiles();
            } catch (e) {
                console.error(error);
                this.app.profiles = structuredClone(empty);
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
                    binding.blendshapes.forEach((bs) => {
                        bs.started = false;
                    });
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
        processAdvanceBindings(binding, results, time) {
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
        processBasicBindings(binding, results) {
            binding.blendshapes.forEach((bs) => {
                if (bs.started) {
                    if (bs.threshold < results[bs.name]) {
                        window.chrome.webview.postMessage(bs.ahk.start);
                        bs.started = false;
                    }
                } else {
                    if (bs.threshold > results[bs.name]) {
                        window.chrome.webview.postMessage(bs.ahk.stop);
                        bs.started = true;
                    }
                }
            });
        },
        processBindings(bindings, results, time) {
            bindings?.forEach((binding) => {
                if (binding.advance) {
                    this.processAdvanceBindings(binding.start, results, time);
                    this.processAdvanceBindings(binding.stop, results, time);
                }
                else {
                    this.processBasicBindings(binding, results);
                }
                // if(!binding.started) {
                //     binding.started = this.processBinding(binding.start, results, time)
                // }
                // else {
                //     binding.started = this.processBinding(binding.stop, results, time);
                // }
            });
        }
    }
});

application.mount("#app");