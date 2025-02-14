import { EQUIPMENT } from './cardCategories.js';
import setup from './setup.js';
import { drawCard, drawCards, discard, nextAlivePlayerPos } from './helper.js';

/* Moves */

function selectCharacter(G, ctx, index) {
    const { startPlayerIndex, characterChoices, characters, healths } = G;
    const { numPlayers, playerID, playOrder } = ctx;
    const character = characterChoices[playerID][index];
    characterChoices[playerID] = undefined;
    characters[playerID] = character;
    let maxHealth = character.health;
    if (numPlayers >= 4 && playOrder[startPlayerIndex] === playerID) {
        // if >= 4 players, add 1 extra health for the King
        maxHealth++;
    }
    healths[playerID] = {
        max: maxHealth,
        current: maxHealth,
    };
}

function draw(G, ctx) {
    const { hands, hasJudgment } = G;
    const { playerID, currentPlayer } = ctx;
    const card = drawCard(G, ctx);
    if (playerID === currentPlayer && hasJudgment[playerID]) {
        flipObject(G, ctx, card.id);
        discard(G, ctx, card);
    }
    else {
        hands[playerID].push(card);
    }
}

function judgment(G, ctx) {
    const card = drawCard(G, ctx);
    discard(G, ctx, card);
}

function play(G, ctx, index, targetPlayerID, forceCategory) {
    const { hands, equipment, isFlipped, hasJudgment } = G;
    const { playerID } = ctx;
    const [card] = hands[playerID].splice(index, 1);
    if (card === undefined) {
        return;
    }
    const category = forceCategory || EQUIPMENT[card.type];
    if (!isFlipped[card.id] && category) {
        if (targetPlayerID === undefined) {
            targetPlayerID = playerID;
        }
        if (equipment[targetPlayerID][category]) {
            discard(G, ctx, equipment[targetPlayerID][category]);
        }
        if (['Capture', 'Starvation'].includes(EQUIPMENT[card.type])) {
            hasJudgment[targetPlayerID] = true;
        }
        equipment[targetPlayerID][category] = card;
    } else {
        discard(G, ctx, card);
    }
}

function pickUp(G, ctx, index) {
    const { discard, hands } = G;
    const { playerID } = ctx;
    const [card] = discard.splice(index, 1);
    hands[playerID].push(card);
}

function give(G, ctx, index, otherPlayerID) {
    const { hands } = G;
    const { playerID } = ctx;
    const [card] = hands[playerID].splice(index, 1);
    if (card === undefined) {
        return;
    }
    hands[otherPlayerID].push(card);
}

function dismantle(G, ctx, target) {
    const { hands, equipment, hasJudgment } = G;
    if (target.index !== undefined) {
        const [card] = hands[target.playerID].splice(target.index, 1);
        discard(G, ctx, card);
    } else {
        const card = equipment[target.playerID][target.category];
        equipment[target.playerID][target.category] = undefined;
        discard(G, ctx, card);
        if (hasJudgment[target.playerID] && !equipment[target.playerID]['Starvation'] && !equipment[target.playerID]['Capture']) {
            delete hasJudgment[target.playerID];
        }
    }
}

function steal(G, ctx, target) {
    const { hands, equipment, hasJudgment } = G;
    const { playerID } = ctx;
    if (target.index !== undefined) {
        const [card] = hands[target.playerID].splice(target.index, 1);
        hands[playerID].push(card);
    } else {
        const card = equipment[target.playerID][target.category];
        equipment[target.playerID][target.category] = undefined;
        hands[playerID].push(card);
        if (hasJudgment[target.playerID] && !equipment[target.playerID]['Starvation'] && !equipment[target.playerID]['Capture']) {
            delete hasJudgment[target.playerID];
        }
    }
}

function toggleChain(G, ctx) {
    const { isChained } = G;
    const { playerID } = ctx;
    isChained[playerID] = !isChained[playerID];
}

function flipObject(G, _ctx, objectID) {
    const { isFlipped } = G;
    isFlipped[objectID] = !isFlipped[objectID];
}

function reveal(G, ctx, index, otherPlayerID) {
    const { hands, privateZone } = G;
    const { playerID } = ctx;
    const [card] = hands[playerID].splice(index, 1);
    if (card === undefined) {
        return;
    }
    privateZone.push({
        card,
        source: { playerID },
        visibleTo: [playerID, otherPlayerID],
    });
}

function returnCard(G, _ctx, id) {
    const { deck, hands, privateZone } = G;
    const index = privateZone.findIndex(item => item.card.id === id);
    const [{ card, source }] = privateZone.splice(index, 1);
    if (source.playerID !== undefined) {
        hands[source.playerID].push(card);
    } else if (source.deck) {
        deck.push(card);
    }
}

function harvest(G, ctx) {
    const { isAlive, harvest } = G;
    const { playOrder } = ctx;
    const numPlayers = playOrder.filter(player => isAlive[player]).length;
    for (let i = 0; i < numPlayers; i++) {
        const card = drawCard(G, ctx);
        harvest.push(card);
    }
}

function putDownHarvest(G, ctx, index) {
    const { hands, harvest } = G;
    const { playerID } = ctx;
    const [card] = hands[playerID].splice(index, 1);
    if (card === undefined) {
        return;
    }
    harvest.push(card);
}

function pickUpHarvest(G, ctx, index) {
    const { hands, harvest } = G;
    const { playerID } = ctx;
    const [card] = harvest.splice(index, 1);
    hands[playerID].push(card);
}

function finishHarvest(G) {
    const { discard, harvest } = G;
    discard.push(...harvest.splice(0, harvest.length).reverse());
}

function openCharacterZone(G, ctx, index) {
    const { isCharacterZoneOpen } = G;
    const { playerID } = ctx;
    isCharacterZoneOpen[playerID] = true;
}

function closeCharacterZone(G, ctx, index) {
    const { isCharacterZoneOpen } = G;
    const { playerID } = ctx;
    isCharacterZoneOpen[playerID] = false;
}

function putOnCharacter(G, ctx, index) {
    const { hands, putOnCharacterZone } = G;
    const { playerID } = ctx;
    const [card] = hands[playerID].splice(index, 1);
    if (card === undefined) {
        return;
    }
    putOnCharacterZone.push({
        card,
        visibleTo: [playerID],
    });
}

function pickUpCharacter(G, ctx, index) {
    const { hands, putOnCharacterZone } = G;
    const { playerID } = ctx;
    const [card] = putOnCharacterZone.splice(index, 1);
    hands[playerID].push(card.card);
}

function passLightning(G, ctx) {
    const { equipment } = G;
    const { numPlayers, playOrder } = ctx;
    for (let i = 0; i < numPlayers; i++) {
        if (equipment[playOrder[i]]['Lightning'] !== undefined) {
            const newPos = nextAlivePlayerPos(G, ctx, i);
            equipment[playOrder[newPos]]['Lightning'] = equipment[playOrder[i]]['Lightning'];
            equipment[playOrder[i]]['Lightning'] = undefined;
            return;
        }
    }
}

function skipJudgment(G, ctx) {
    const { hasJudgment } = G;
    const { playerID } = ctx;
    delete hasJudgment[playerID];
}

function astrology(G, ctx, numCards) {
    const { isAlive, privateZone } = G;
    const { playerID, playOrder } = ctx;
    const actualNumCards = numCards || Math.min(playOrder.filter(player => isAlive[player]).length, 5);
    for (let i = 0; i < actualNumCards; i++) {
        const card = drawCard(G, ctx);
        privateZone.push({
            card,
            source: { deck: true },
            visibleTo: [playerID],
        });
    }
}

function finishAstrology(G) {
    const { deck, privateZone } = G;
    deck.splice(0, 0, ...privateZone.filter(item => item.source.deck).map(item => item.card));
    G.privateZone = privateZone.filter(item => !item.source.deck);
}

function winHearts(G, ctx) {
    const { privateZone } = G;
    const { playerID } = ctx;

    for (let i = 0; i < 3; i++) {
        const card = drawCard(G, ctx);
        privateZone.push({
            card,
            source: { deck: true },
            visibleTo: [playerID],
        });
    }
}

function finishWinHearts(G) {
    const { discard, privateZone } = G;
    discard.push(...privateZone.filter(item => item.source.deck).map(item => item.card));
    G.privateZone = privateZone.filter(item => !item.source.deck);
}

function refusingDeath(G, ctx, change) {
    const { healths, refusingDeath } = G;
    const { playerID, random } = ctx;
    if (change === -1) {
        const newValue = random.Die(13);
        refusingDeath.push(newValue);
        healths[playerID].current = 0;
    } else if (change === 1) {
        refusingDeath.pop();
        if (refusingDeath.length === 0) {
            healths[playerID].current = 1;
            refusingDeath.push(1);
        }
    }
}

function alliance(G, _ctx, player1, player2) {
    const { hands } = G;
    const temp = hands[player1];
    hands[player1] = hands[player2];
    hands[player2] = temp;
}

function collapse(G, ctx) {
    const { healths } = G;
    const { playerID } = ctx;
    healths[playerID].max--;
    if (healths[playerID].max < 0) {
        healths[playerID].max = 8;
    }
    if (healths[playerID].current > healths[playerID].max) {
        healths[playerID].current--;
    }
}

function updateHealth(G, ctx, change) {
    const { healths } = G;
    const { playerID } = ctx;
    healths[playerID].current += change;
    if (healths[playerID].current > healths[playerID].max) {
        healths[playerID].current = healths[playerID].max;
    }
    if (healths[playerID].current < 0) {
        healths[playerID].current = 0;
    }
}

function updateMaxHealth(G, ctx, change) {
    const { healths } = G;
    const { playerID } = ctx;
    healths[playerID].max += change;
    if (healths[playerID].max < 1) {
        healths[playerID].max = 1;
    }
    if(healths[playerID].max > 10) {
        healths[playerID].max = 10;
    }
    if (healths[playerID].current > healths[playerID].max) {
        healths[playerID].current = healths[playerID].max;
    }
}

function die(G, ctx) {
    const { isAlive } = G;
    const { currentPlayer, events, playerID } = ctx;
    delete isAlive[playerID];
    if (currentPlayer === playerID) {
        events.endTurn();
    }
}

function endPlay(G, ctx) {
    const { healths, hands } = G;
    const { currentPlayer, events, playerID } = ctx;
    if (currentPlayer === playerID) {
        events.setStage('discard');
        if (hands[playerID].length <= healths[playerID].current) {
            events.endTurn();
        }
    }
}

function discardCard(G, ctx, index) {
    const { healths, hands } = G;
    const { events, playerID } = ctx;
    const [card] = hands[playerID].splice(index, 1);
    if (card === undefined) {
        return;
    }
    discard(G, ctx, card);
    if (hands[playerID].length <= healths[playerID].current) {
        events.endTurn();
    }
}

function finishDiscard(_G, ctx) {
    const { currentPlayer, events, playerID } = ctx;
    if (currentPlayer === playerID) {
        events.endTurn();
    }
}

/* Game object */

const turnOrder = {
    first: G => G.startPlayerIndex,
    next: (G, ctx) => nextAlivePlayerPos(G, ctx, ctx.playOrderPos),
};

export const SanGuoSha = {
    name: "san-guo-sha",

    setup,

    playerView: (G, ctx, playerID) => {
        const { roles, characterChoices, characters, isAlive } = G;
        const { numPlayers, playOrder } = ctx;

        const newRoles = { ...roles };
        for (let i = 0; i < numPlayers; i++) {
            if (playOrder[i] !== playerID && isAlive[playOrder[i]] && newRoles[i].name !== 'King') {
                newRoles[i] = {id: roles[i].id};
            }
        }

        const newCharacters = { ...characters };
        const areAllCharactersChosen = Object.values(characterChoices).every(choices => choices === undefined);
        if (!areAllCharactersChosen) {
            for (let i = 0; i < numPlayers; i++) {
                if (playOrder[i] !== playerID && newRoles[i].name !== 'King') {
                    delete newCharacters[playOrder[i]];
                }
            }
        }

        return {
            ...G,
            roles: newRoles,
            characters: newCharacters,
        };
    },

    phases: {
        selectCharacters: {
            start: true,

            onBegin: (G, ctx) => {
                const { startPlayerIndex } = G;
                const { events, playOrder } = ctx;
                events.setActivePlayers({
                    value: {[playOrder[startPlayerIndex]]: 'selectCharacter'},
                    moveLimit: 1,
                    next: {
                        others: 'selectCharacter',
                        moveLimit: 1,
                    }
                });

                // make character choices automatically for easier testing
                // TODO remove
                // playOrder.forEach(player => selectCharacter(G, { ...ctx, playerID: player }, 0));
            },

            // end select characters phase if everyone has made a character choice
            endIf: G => Object.values(G.characterChoices).every(choices => choices === undefined),

            next: 'play',

            turn: {
                order: turnOrder,
                stages: {
                    selectCharacter: {
                        moves: { selectCharacter },
                    },
                },
            }
        },

        play: {
            onBegin: (G, ctx) => {
                const { playOrder } = ctx;
                playOrder.forEach(player => drawCards(G, ctx, player, 4));
            },

            turn: {
                order: turnOrder,
                onBegin: (_G, ctx) => {
                    const { events } = ctx;
                    // everyone can play cards in freeform mode
                    events.setActivePlayers({ all: 'play' });
                },
                stages: {
                    play: {
                        moves: {
                            draw,
                            judgment,
                            play,
                            pickUp,
                            give,
                            dismantle,
                            steal,
                            toggleChain,
                            flipObject,
                            reveal,
                            returnCard,
                            harvest,
                            putDownHarvest,
                            pickUpHarvest,
                            finishHarvest,
                            openCharacterZone,
                            closeCharacterZone,
                            putOnCharacter,
                            pickUpCharacter,
                            passLightning,
                            astrology,
                            finishAstrology,
                            winHearts,
                            finishWinHearts,
                            refusingDeath,
                            alliance,
                            collapse,
                            updateHealth,
                            updateMaxHealth,
                            die,
                            endPlay,
                            skipJudgment,
                         },
                    },
                    discard: {
                        moves: { pickUp, discardCard, finishDiscard },
                    },
                },
            },
        },
    },

    minPlayers: 2,

    maxPlayers: 10,

    endIf: (G, ctx) => {
        const { isAlive } = G;
        const { playOrder } = ctx;
        return playOrder.filter(player => isAlive[player]).length === 1;
    },
};
