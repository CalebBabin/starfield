import * as THREE from 'three';

const chatIntegration = require('./chat.js');

const globalConfig = {
	speed: 0.003,
	emoteScale: 3,
	starScale: 0.075,
	spawnAreaSize: 50,
	safeSpace: 3,
	spawnRate: 1,
	cameraDistance: 400,
	cameraFar: 1000,
}

const getSpawnPosition = () => {
	return (Math.random() > 0.5 ? -1 : 1) * (((globalConfig.spawnAreaSize - globalConfig.safeSpace) * Math.random() / 2) + globalConfig.safeSpace);
}

const plane_geometry = new THREE.PlaneBufferGeometry(globalConfig.emoteScale, globalConfig.emoteScale);
const star_geometry = new THREE.SphereBufferGeometry(globalConfig.starScale);
const star_material = new THREE.MeshBasicMaterial({ color: 0xffffff });

window.addEventListener('DOMContentLoaded', () => {
	let camera, scene, renderer;
	const stars = [];
	let spawnTick = 0;

	init();
	draw();

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

		spawnTick += globalConfig.spawnRate;

		while (spawnTick >= 1) {
			spawnTick -= 1;

			const mesh = new THREE.Mesh(star_geometry, star_material);
			mesh.position.x = getSpawnPosition();
			mesh.position.y = getSpawnPosition();


			stars.push({
				progress: 0,
				mesh: mesh,
			})

			scene.add(mesh);
			//spawn "star"
		}

		for (let index = stars.length - 1; index >= 0; index--) {
			const star = stars[index];
			star.progress += globalConfig.speed;

			star.mesh.position.z = star.progress * globalConfig.cameraDistance;

			if (star.progress >= 1) {
				scene.remove(star.mesh);
				stars.splice(index, 1);
			}
		}

		for (let index = 0; index < chatIntegration.emotes.length; index++) {
			const emotes = chatIntegration.emotes[index];

			if (!emotes.group) {
				emotes.group = new THREE.Group();
				emotes.group.position.x = getSpawnPosition();
				emotes.group.position.y = getSpawnPosition();
				emotes.initGroup = true;
			}

			emotes.group.position.z = emotes.progress * globalConfig.cameraDistance;

			if (emotes.progress > 1) {
				for (let i = 0; i < emotes.emotes.length; i++) {
					const emote = emotes.emotes[i];
					emotes.group.remove(emote.sprite);
				}
				scene.remove(emotes.group);
				chatIntegration.emotes.splice(index, 1);
			} else {
				emotes.progress += globalConfig.speed;

				for (let i = 0; i < emotes.emotes.length; i++) {
					const emote = emotes.emotes[i];
					if (emote) {
						if (!emote.sprite) {
							emote.sprite = new THREE.Mesh(plane_geometry, new THREE.MeshBasicMaterial({ map: emote.material.texture, transparent: true }));
							emote.sprite.position.x += i * globalConfig.emoteScale;
							emotes.group.add(emote.sprite);
						}
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
})