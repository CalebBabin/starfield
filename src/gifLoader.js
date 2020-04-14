import * as THREE from 'three';

const frameLimit = 256;
const emoteBlacklist = [
	'5e0ea4610550d42106b8955a',
	'566ca38765dbbdab32ec0560',
	'55cb47a82718127806ad3202',
	'5e6fa08bd112fc3725746dd4',
]
class GIF_Instance {
	constructor(id) {
		this.id = id;
		this.gifTiming = 10;
		this.lastFrame = Date.now();
		this.currentFrame = 0;
		this.loadedImages = 0;
		this.frames = [];

		if (id.match(/http/)) {
			this.url = id;
			this.imageFallback();
		} else {
			fetch(`https://gif-emotes.opl.io/gif/${id}`)
				.then(r => r.json())
				.then(data => {
					if (data.count === 0 || !data.count || emoteBlacklist.includes(id)) {
						this.url = `https://gif-emotes.opl.io/gif/${id}.gif`
						this.imageFallback();
					} else {
						this.gifTiming = data.frames[0].delay;
						this.frames = data.frames;
						if (this.frames.length > frameLimit) this.frames = this.frames.splice(0, frameLimit);
						
						for (let index = 0; index < this.frames.length; index++) {
							const frame = this.frames[index];
							frame.image = new Image(frame.width, frame.height);
							frame.image.crossOrigin = "";
							frame.image.addEventListener('load', () => {
								this.loadedImages++;
							})
							frame.image.src = `https://gif-emotes.opl.io/static/${id}/${index}.png`;
						}
						this.loadListener();
					}
				})
		}

		this.canvas = document.createElement('canvas');
		this.canvas.width = 128;
		this.canvas.height = 128;
		this.ctx = this.canvas.getContext('2d');

		this.texture = new THREE.CanvasTexture(this.canvas);
		this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: false });
	}

	imageFallback() {
		this.image = new Image();
		this.image.crossOrigin = "anonymous";
		this.image.addEventListener('load', this.imageFallbackListener.bind(this));

		this.image.src = this.url;
	}
	imageFallbackListener() {
		let pow = 2;
		while (Math.pow(2, pow) < Math.max(this.image.width, this.image.height)) {
			pow++;
		}
		this.canvas.width = Math.pow(2, pow);
		this.canvas.height = Math.pow(2, pow);

		const ratio = Math.min(this.canvas.height / this.image.height, this.canvas.width / this.image.width);

		this.ctx.drawImage(this.image, 0, 0, this.image.width * ratio, this.image.height * ratio);
		this.texture.needsUpdate = true;
		this.material.needsUpdate = true;
	}

	loadListener() {
		let pow = 2;
		while (Math.pow(2, pow) < Math.max(this.frames[0].width, this.frames[0].height)) {
			pow++;
		}
		this.canvas.width = Math.pow(2, pow);
		this.canvas.height = Math.pow(2, pow);

		/*const fx = this.frames[0].width;
		const fy = this.frames[0].height;
		if (fx >= fy) {
			this.drawRatio = this.canvas.width / fx;
		} else {
			this.drawRatio = this.canvas.width / fy;
		}*/

		this.update();
	}

	dispose(frameindex) {

		if (frameindex === -1) {
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		}

		if (this.frames[frameindex].disposal == 2) {
			/*this.ctx.clearRect(
				0,
				0,
				this.canvas.width,
				this.canvas.height);*/
			this.ctx.clearRect(
				this.frames[frameindex].x,
				this.frames[frameindex].y,
				this.frames[frameindex].width,
				this.frames[frameindex].height);
		}

		if (this.frames[frameindex].disposal == 3) {
			//this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			for (let index = frameindex-1; index >= 0; index--) {
				const frame = this.frames[index];
				if (frame.disposal !== 1 || index === 0) {
					if (frame.image.complete) {
						this.ctx.drawImage(frame.canvas, 0, 0);
					}
					break;
				}
			}
		}
	}

	update() {
		window.setTimeout(this.update.bind(this), this.frames[this.currentFrame].delay * 10);

		let timeDiff = Date.now() - this.lastFrame;
		//while (timeDiff > this.gifTiming * 10) {
			this.currentFrame++;
			if (this.currentFrame >= this.frames.length) this.currentFrame = 0;
			timeDiff -= this.gifTiming;
			this.lastFrame += timeDiff;

			if (this.frames[this.currentFrame].image.complete) {
				this.dispose(Math.max(0, this.currentFrame-1));

				this.ctx.drawImage(
					this.frames[this.currentFrame].image,
					0,
					0);
				this.texture.needsUpdate = true;
				this.material.needsUpdate = true;

				if (!this.frames[this.currentFrame].canvas) {
					this.frames[this.currentFrame].canvas = document.createElement('canvas');
					this.frames[this.currentFrame].canvas.width = this.canvas.width;
					this.frames[this.currentFrame].canvas.height = this.canvas.height;
					this.frames[this.currentFrame].ctx = this.frames[this.currentFrame].canvas.getContext('2d');
					this.frames[this.currentFrame].ctx.drawImage(this.canvas, 0, 0);
				}
			}
		//}
	}
}

module.exports = GIF_Instance;
