// ==UserScript==
// @name         Babydoges Autoclicker
// @version      1.0
// @author       DatPT
// @match        *://babydogeclikerbot.com/*
// @icon         https://babydogeclikerbot.com/1492302162/img/styles/space/other/babydoge.png
// @run-at       document-start
// @grant        none
// @downloadURL  https://github.com/datpt1603/air-babydoge/raw/main/autoclicker.user.js
// @updateURL    https://github.com/datpt1603/air-babydoge/raw/main/autoclicker.user.js
// @homepage     https://github.com/datpt1603/air-babydoge
// ==/UserScript==

console.error = console.warn = console.info = console.debug = () => {};

const styles = {
    success: 'background: #28a745; color: #ffffff; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
    starting: 'background: #8640ff; color: #ffffff; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
    error: 'background: #dc3545; color: #ffffff; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
    info: 'background: #007bff; color: #ffffff; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
};
const logPrefix = '%c[BabydogesBOT] ';

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const screenX = 531;
const screenY = 607;

function clickElement(element) {
    const clientX = getRandomInt(0, 485);
    const clientY = getRandomInt(0, 242);

    const pointerdownEvent = new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: clientX,
        clientY: clientY,
        screenX: screenX,
        screenY: screenY,
        pointerId: 1,
        width: 1,
        height: 1,
        pressure: 0.5
    });

    const mousedownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: clientX,
        clientY: clientY,
        screenX: screenX,
        screenY: screenY
    });

    const touchstartEvent = new TouchEvent('touchstart', {
        bubbles: true,
        touches: [new Touch({
            identifier: 1,
            target: element,
            clientX: clientX,
            clientY: clientY
        })]
    });

    const pointerupEvent = new PointerEvent('pointerup', {
        bubbles: true,
        clientX: clientX,
        clientY: clientY,
        screenX: screenX,
        screenY: screenY,
        pointerId: 1,
        width: 1,
        height: 1,
        pressure: 0
    });

    const mouseupEvent = new MouseEvent('mouseup', {
        bubbles: true,
        clientX: clientX,
        clientY: clientY,
        screenX: screenX,
        screenY: screenY
    });

    const touchendEvent = new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [new Touch({
            identifier: 1,
            target: element,
            clientX: clientX,
            clientY: clientY
        })]
    });

    const clickEvent = new PointerEvent('click', {
        bubbles: true,
        clientX: clientX,
        clientY: clientY,
        screenX: screenX,
        screenY: screenY,
        pointerId: 1,
        width: 1,
        height: 1,
        pressure: 0
    });

    element.dispatchEvent(pointerdownEvent);
    element.dispatchEvent(mousedownEvent);
    element.dispatchEvent(touchstartEvent);
    element.dispatchEvent(pointerupEvent);
    element.dispatchEvent(mouseupEvent);
    element.dispatchEvent(touchendEvent);
    element.dispatchEvent(clickEvent);
}

function getEnergyLevel() {
    const energyElement = document.querySelector('main > section > div > button > div > div > p');
    return energyElement ? parseInt(energyElement.textContent.split('/')[0], 10) : null;
}

function autoClicker() {
    const tapDogeDiv = document.querySelector('div[data-testid="tap_doge"]');
    const element = tapDogeDiv.querySelector('img');
    if (element) {
        clickElement(element);
    } else {
        console.log(`${logPrefix}Element not found`, styles.error);
    }
}

function runAutoClicker() {
    try {
        const energyLevel = getEnergyLevel();
        if (energyLevel === null) {
            console.log(`${logPrefix}Energy level not found, retrying...`, styles.error);
            setTimeout(runAutoClicker, 1000);
        } else if (energyLevel <= 25) {
            const pauseTime = getRandomInt(30000, 60000);
            console.log(`${logPrefix}Energy low (${energyLevel}), pausing for ${pauseTime} ms`, styles.info);
            setTimeout(runAutoClicker, pauseTime);
        } else {
            autoClicker();
            const intervalTime = getRandomInt(30, 120);
            setTimeout(runAutoClicker, intervalTime);
        }
    } catch (error) {
        console.log(`${logPrefix}Error in autoClicker: ${error.message}`, styles.error);
        setTimeout(runAutoClicker, 1000);
    }
}

setTimeout(runAutoClicker, 3000);
