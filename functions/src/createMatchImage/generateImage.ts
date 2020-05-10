import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';

const IMAGE_DIMS = 2400;

const MAP_SIZES = {
    karakin: 204000,
    vikendi: 612000,
    sanhok: 408000,
    erangel: 816000,
    miramar: 816000,
};

const MAP_URLS = {
    karakin: 'https://storage.googleapis.com/discord-pubg-bot-map-event-images-bucket/maps/karakin.jpg',
};

const getMapCoords = (x: number, y: number) => {
    const mapX = Math.round((x / MAP_SIZES.karakin) * IMAGE_DIMS);
    const mapY = Math.round((y / MAP_SIZES.karakin) * IMAGE_DIMS);

    return { mapX, mapY };
};

const drawPaths = (ctx: any, positions: any) => {
    ctx.strokeStyle = 'yellow';

    let lastMapX = 0;
    let lastMapY = 0;

    positions.forEach((position: any, i: number) => {
        const { mapX, mapY } = getMapCoords(position.character.location.x, position.character.location.y);

        if (i > 0) {
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.moveTo(lastMapX, lastMapY);
            ctx.lineTo(mapX, mapY);
            ctx.stroke();
        }

        lastMapX = mapX;
        lastMapY = mapY;
    });
};

const drawLandings = (ctx: any, landings: any) => {
    ctx.fillStyle = 'green';

    landings.forEach((landing: any) => {
        const { mapX, mapY } = getMapCoords(landing.location.x, landing.location.y);
        ctx.beginPath();
        ctx.arc(mapX, mapY, 8, 0, 2 * Math.PI);
        ctx.fill();
    });
};

const drawKills = (ctx: any, kills: any) => {
    ctx.strokeStyle = 'red';

    kills.forEach((kill: any) => {
        const { mapX, mapY } = getMapCoords(kill.killer.location.x, kill.killer.location.y);

        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(mapX - 8, mapY - 8);
        ctx.lineTo(mapX + 8, mapY + 8);
        ctx.moveTo(mapX - 8, mapY + 8);
        ctx.lineTo(mapX + 8, mapY - 8);
        ctx.stroke();
    });
};

const drawDeaths = (ctx: any, deaths: any) => {
    ctx.fillStyle = 'red';

    deaths.forEach((death: any) => {
        const { mapX, mapY } = getMapCoords(death.victim.location.x, death.victim.location.y);
        ctx.beginPath();
        ctx.arc(mapX, mapY, 8, 0, 2 * Math.PI);
        ctx.fill();
    });
};

export const generateImage = async (filename: string, positions: any, landings: any, kills: any, deaths: any) => {
    const canvas = createCanvas(IMAGE_DIMS, IMAGE_DIMS);
    const ctx = canvas.getContext('2d');
    try {
        const image = await loadImage(MAP_URLS['karakin']);
        ctx.drawImage(image, 0, 0, IMAGE_DIMS, IMAGE_DIMS);

        drawPaths(ctx, positions);
        drawLandings(ctx, landings);
        drawKills(ctx, kills);
        drawDeaths(ctx, deaths);
    } catch (e) {
        console.log('Error when generating image.');
        console.log(e);
    }

    return new Promise((resolve, reject) => {
        console.log(`Starting to save temporary file. Location: ${filename}...`);
        const out = fs.createWriteStream(filename);
        const stream = canvas.createPNGStream();
        stream.pipe(out);
        out.on('finish', () => {
            console.log('Saved temp file.');
            resolve();
        });
        out.on('error', (error) => {
            console.log('Error when saving temp file.');
            console.log(error);
            reject();
        });
    });
};
