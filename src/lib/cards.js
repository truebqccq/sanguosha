export function drawCards(G, ctx, player, count) {
    const { deck, discard, hands } = G;
    const { random } = ctx;

    for (let i = 0; i < count; i++) {
        if (deck.length === 0) {
            // shuffle cards in discard back into the deck
            if (discard.length === 0) {
                console.error('No cards left!');
            }
            deck.push(...random.Shuffle(discard.splice(0, discard.length)));
        }
        hands[player].push(G.deck.pop());
    }
}

function loseHealth(G, ctx, player, count) {
    const { healths } = G;
    const { events } = ctx;
    healths[player].current -= count;
    if (healths[player].current <= 0) {
        // brink of death
        G.dyingPlayer = player;
        G.passedPlayers = {};
        events.setActivePlayers({
            all: 'brinkOfDeath',
        });
    }
}

function setActivePlayers(G, ctx, newActivePlayers) {
    const { dyingPlayer } = G;
    const { events } = ctx;
    if (dyingPlayer !== undefined) {
        // If we're in the middle of brink of death, store the active players to set later
        G.storedActivePlayers = newActivePlayers;
    } else {
        events.setActivePlayers(newActivePlayers);
    }
}

export function prepareNextPlay(G, ctx) {
    setActivePlayers(G, ctx, {
        currentPlayer: 'play',
    })
    G.activeCardType = undefined;
    G.activeCardData = {};
    G.targets = [];
}

function roundRobinAttack(defendingCard) {
    return {
        canPlayCard: () => true,
        playCard: (G, ctx) => {
            const { activeCardData, targets } = G;
            const { currentPlayer, numPlayers, playOrder, playOrderPos } = ctx;
            activeCardData.index = 0;
            targets.push(...[...Array(numPlayers - 1)]
                .map((_, i) => {
                    return {
                        targeter: currentPlayer,
                        target: playOrder[(playOrderPos + i + 1) % numPlayers],
                    };
                }));
            setActivePlayers(G, ctx, {
                value: { [playOrder[(playOrderPos + activeCardData.index + 1) % numPlayers]]: 'play' },
                moveLimit: 1,
            });
        },
        current: _data => {
            const next = (G, ctx) => {
                const { activeCardData, targets } = G;
                const { numPlayers, playOrder, playOrderPos } = ctx;
                targets.splice(0, 1);
                activeCardData.index++;
                if (activeCardData.index < numPlayers - 1) {
                    setActivePlayers(G, ctx, {
                        value: { [playOrder[(playOrderPos + activeCardData.index + 1) % numPlayers]]: 'play' },
                        moveLimit: 1,
                    });
                } else {
                    prepareNextPlay(G, ctx);
                }
            };
            return {
                text: 'Take the hit',
                miscAction: (G, ctx) => {
                    const { activeCardData } = G;
                    const { numPlayers, playOrder, playOrderPos } = ctx;
                    loseHealth(G, ctx, playOrder[(playOrderPos + activeCardData.index + 1) % numPlayers], 1);
                    next(G, ctx);
                },
                canPlayCard: (_G, _ctx, _playerID, card) => card.type === defendingCard,
                playCard: (G, ctx, _card) => {
                    next(G, ctx);
                },
            };
        },
    };
}

export const CARD_TYPES = {
    'Attack': {
        canPlayCard: () => true,
        playCard: (G, ctx) => {
            setActivePlayers(G, ctx, {
                currentPlayer: 'play',
                moveLimit: 1,
            });
        },
        current: data => {
            if (data.target === undefined) {
                return {
                    text: 'Select player',
                    canSelectPlayer: (_G, _ctx, playerID, selectedPlayerID) => {
                        // TODO take range into account
                        return playerID !== selectedPlayerID;
                    },
                    selectPlayer: (G, ctx, selectedPlayerID) => {
                        const { activeCardData, targets } = G;
                        const { playerID } = ctx;
                        activeCardData.target = selectedPlayerID;
                        targets.push({ targeter: playerID, target: selectedPlayerID });
                        setActivePlayers(G, ctx, {
                            value: { [selectedPlayerID]: 'play' },
                            moveLimit: 1,
                        });
                    }
                };
            } else {
                return {
                    text: 'Take the hit',
                    miscAction: (G, ctx) => {
                        loseHealth(G, ctx, data.target, 1);
                        prepareNextPlay(G, ctx);
                    },
                    canPlayCard: (_G, _ctx, _playerID, card) => card.type === 'Dodge',
                    playCard: prepareNextPlay,
                };
            }
        },
    },
    'Dodge': {
        canPlayCard: () => false,
    },
    'Peach': {
        canPlayCard: () => true,
        playCard: (G, ctx) => {
            const { healths } = G;
            const { currentPlayer } = ctx;
            healths[currentPlayer].current = Math.min(healths[currentPlayer].current + 1, healths[currentPlayer].max);
            prepareNextPlay(G, ctx);
        },
    },
    'Barbarians': roundRobinAttack('Attack'),
    'Hail of Arrows': roundRobinAttack('Dodge'),
    'Peach Garden': {
        canPlayCard: () => true,
        playCard: (G, ctx) => {
            const { healths } = G;
            const { playOrder } = ctx;
            playOrder.forEach(player => healths[player].current = Math.min(healths[player].current + 1, healths[player].max));
            prepareNextPlay(G, ctx);
        },
    },
};
