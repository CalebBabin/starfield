import './main.css';
import * as THREE from 'three';
import Chat from 'twitch-chat-emotes';

let channels = ['moonmoon'];
const query_vars = {};
const query_parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
	query_vars[key] = value;
});
if (query_vars.channels) {
	channels = query_vars.channels.split(',');
}

const ChatInstance = new Chat({
	channels,
})

const emoteTextures = {};
const pendingEmoteArray = [];
ChatInstance.on("emotes", (e) => {
	const output = { emotes: [] };
	for (let index = 0; index < e.length; index++) {
		const emote = e[index];
		if (!emoteTextures[emote.id]) {
			emoteTextures[emote.id] = new THREE.CanvasTexture(emote.gif.canvas);
		}
		emote.texture = emoteTextures[emote.id];
		output.emotes.push(emote);
	}
	pendingEmoteArray.push(output);
})


const globalConfig = {
	speed: 0.002,
	emoteSpeedRatio: 0.75, // set to 1 for 1:1 movement with the star speed
	emoteScale: 3,
	starScale: 0.1,
	starLength: 6,
	spawnAreaSize: 90,
	emoteSpawnRatio: 0.5,
	safeSpace: 8,
	spawnRate: 5,
	cameraDistance: 250,
	cameraFar: 1000,
}

const getSpawnPosition = (multiplier = 1, toggle = false) => {
	let spawnAreaSize = globalConfig.spawnAreaSize;
	let safeSpace = globalConfig.safeSpace / 2;
	let distanceR = Math.random();
	if (toggle) {
		safeSpace = globalConfig.safeSpace;
		spawnAreaSize *= 2;
	} else {
		distanceR = 1 - distanceR * distanceR;
	}
	const direction = Math.random() * Math.PI * 2;
	const distance = distanceR * (spawnAreaSize * multiplier - safeSpace) + safeSpace;
	const x = Math.sin(direction) * distance * widthRatio;
	const y = Math.cos(direction) * distance * heightRatio;
	return { x, y };
}

const widthRatio = Math.min(window.innerWidth / window.innerHeight, 1);
const heightRatio = Math.min(window.innerHeight / window.innerWidth, 1);

const plane_geometry = new THREE.PlaneBufferGeometry(globalConfig.emoteScale, globalConfig.emoteScale);
const star_geometry = new THREE.BoxBufferGeometry(globalConfig.starScale, globalConfig.starScale, globalConfig.starScale * globalConfig.starLength);
const star_material = new THREE.MeshBasicMaterial({ color: 0xffffff });


let lastFrame = Date.now();
let camera, scene, renderer;
const stars = [];
let spawnTick = 0;


function init() {
	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, globalConfig.cameraFar);
	camera.position.x = 0;
	camera.position.y = 0;
	camera.position.z = globalConfig.cameraDistance;
	camera.lookAt(0, 0, 0);

	scene = new THREE.Scene();

	const light = new THREE.AmbientLight(0xeeeeee);
	scene.add(light);

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	window.addEventListener('resize', () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	})
	document.body.appendChild(renderer.domElement);
}

function draw() {
	requestAnimationFrame(draw);

	for (const key in emoteTextures) {
		if (emoteTextures.hasOwnProperty(key)) {
			const element = emoteTextures[key];
			element.needsUpdate = true;
		}
	}

	const speedTimeRatio = (Date.now() - lastFrame) / 16;
	lastFrame = Date.now();

	spawnTick += globalConfig.spawnRate;

	while (spawnTick >= 1) {
		spawnTick -= 1;

		const mesh = new THREE.Mesh(star_geometry, star_material);
		const position = getSpawnPosition(1, true);
		mesh.position.x = position.x;
		mesh.position.y = position.y;


		stars.push({
			progress: 0,
			mesh: mesh,
		})

		scene.add(mesh);
		//spawn "star"
	}

	for (let index = stars.length - 1; index >= 0; index--) {
		const star = stars[index];
		star.progress += globalConfig.speed * speedTimeRatio * 1.1;

		star.mesh.position.z = star.progress * globalConfig.cameraDistance;

		if (star.progress >= 1) {
			scene.remove(star.mesh);
			stars.splice(index, 1);
		}
	}

	for (let index = 0; index < pendingEmoteArray.length; index++) {
		const emotes = pendingEmoteArray[index];

		if (!emotes.group) {
			emotes.progress = 0;
			emotes.group = new THREE.Group();
			const position = getSpawnPosition(globalConfig.emoteSpawnRatio);
			emotes.group.position.x = position.x;
			emotes.group.position.y = position.y;
			emotes.initGroup = true;
		}

		emotes.group.position.z = emotes.progress * globalConfig.cameraDistance;

		if (emotes.progress > 1) {
			for (let i = 0; i < emotes.emotes.length; i++) {
				const emote = emotes.emotes[i];
				emotes.group.remove(emote.sprite);
			}
			scene.remove(emotes.group);
			pendingEmoteArray.splice(index, 1);
		} else {
			emotes.progress += globalConfig.speed * globalConfig.emoteSpeedRatio * speedTimeRatio;

			for (let i = 0; i < emotes.emotes.length; i++) {
				const emote = emotes.emotes[i];
				if (emote && !emote.sprite) {
					emote.sprite = new THREE.Mesh(plane_geometry, new THREE.MeshBasicMaterial({ map: emote.texture, transparent: true }));
					emote.sprite.position.x += i * globalConfig.emoteScale;
					emotes.group.add(emote.sprite);
				}
				if (emote && emote.sprite) {
					emote.sprite.material.needsUpdate = true;
				}
			}

			if (emotes.initGroup) {
				emotes.initGroup = false;
				scene.add(emotes.group);
			}
		}
	}

	renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', () => {
	init();
	draw();
})