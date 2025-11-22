document.addEventListener('DOMContentLoaded', () => {
    console.log('Panda Solitaire Initialized');

    // Game State
    const state = {
        deck: [],
        stock: [],
        waste: [],
        foundations: [[], [], [], []],
        tableau: [[], [], [], [], [], [], []],
        score: 1000
    };

    // Card Configuration
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = Array.from({ length: 13 }, (_, i) => i + 1);

    // DOM Elements
    const scoreEl = document.getElementById('score');

    function initGame() {
        createDeck();
        shuffleDeck();
        dealCards();
        renderGame();
    }

    function createDeck() {
        state.deck = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                state.deck.push({ suit, rank, faceUp: false });
            }
        }
    }

    function shuffleDeck() {
        for (let i = state.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]];
        }
    }

    function dealCards() {
        // Deal to Tableau
        for (let i = 0; i < 7; i++) {
            for (let j = i; j < 7; j++) {
                const card = state.deck.pop();
                if (i === j) {
                    card.faceUp = true;
                }
                state.tableau[j].push(card);
            }
        }
        // Remaining to Stock
        state.stock = [...state.deck];
        state.deck = []; // Clear deck as it's now in stock
    }

    function renderGame() {
        // Render Stock
        const stockEl = document.getElementById('stock');
        stockEl.innerHTML = '';
        if (state.stock.length > 0) {
            const cardEl = createCardElement(null, false); // Back of card
            cardEl.addEventListener('click', drawFromStock);
            stockEl.appendChild(cardEl);
        } else {
            // Empty stock placeholder (click to reset waste to stock if needed)
            const emptyEl = document.createElement('div');
            emptyEl.className = 'card-placeholder';
            emptyEl.addEventListener('click', resetStock);
            stockEl.appendChild(emptyEl);
        }

        // Render Waste
        const wasteEl = document.getElementById('waste');
        wasteEl.innerHTML = '';
        if (state.waste.length > 0) {
            const card = state.waste[state.waste.length - 1];
            const cardEl = createCardElement(card, true);
            makeDraggable(cardEl, 'waste', state.waste.length - 1);
            wasteEl.appendChild(cardEl);
        }

        // Render Foundations
        state.foundations.forEach((pile, index) => {
            const foundationEl = document.getElementById(`foundation-${index + 1}`);
            foundationEl.innerHTML = '';
            if (pile.length > 0) {
                const card = pile[pile.length - 1];
                const cardEl = createCardElement(card, true);
                // Foundation cards usually aren't dragged out in simple versions, but let's allow it
                makeDraggable(cardEl, 'foundation', index);
                foundationEl.appendChild(cardEl);
            }
        });

        // Render Tableau
        state.tableau.forEach((pile, index) => {
            const tableauEl = document.getElementById(`tableau-${index + 1}`);
            tableauEl.innerHTML = '';
            pile.forEach((card, cardIndex) => {
                const cardEl = createCardElement(card, card.faceUp);
                cardEl.style.top = `${cardIndex * 30}px`; // Cascade effect
                if (card.faceUp) {
                    makeDraggable(cardEl, 'tableau', index, cardIndex);
                }
                tableauEl.appendChild(cardEl);
            });
        });

        scoreEl.textContent = state.score;
    }

    function createCardElement(card, faceUp) {
        const el = document.createElement('div');
        el.className = 'card';

        if (!faceUp) {
            el.classList.add('back');
            return el;
        }

        el.classList.add('face');
        el.classList.add(card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black');
        el.dataset.suit = card.suit;
        el.dataset.rank = card.rank;

        const suitSymbols = {
            hearts: '♥',
            diamonds: '♦',
            clubs: '♣',
            spades: '♠'
        };

        const rankSymbols = {
            1: 'A', 11: 'J', 12: 'Q', 13: 'K'
        };
        const rankDisplay = rankSymbols[card.rank] || card.rank;

        el.innerHTML = `
            <div class="card-top">
                <span>${rankDisplay}</span>
                <span>${suitSymbols[card.suit]}</span>
            </div>
            <div class="card-center">
                ${suitSymbols[card.suit]}
            </div>
            <div class="card-bottom">
                <span>${rankDisplay}</span>
                <span>${suitSymbols[card.suit]}</span>
            </div>
        `;

        return el;
    }

    function drawFromStock() {
        if (state.stock.length === 0) return;
        const card = state.stock.pop();
        card.faceUp = true;
        state.waste.push(card);
        renderGame();
    }

    function resetStock() {
        if (state.stock.length === 0 && state.waste.length > 0) {
            // Reverse waste to become new stock
            state.stock = state.waste.reverse().map(c => ({ ...c, faceUp: false }));
            state.waste = [];
            renderGame();
        }
    }

    // Drag and Drop Logic
    let draggedCard = null;
    let dragSource = null;
    let dragOffset = { x: 0, y: 0 };
    let originalPosition = { x: 0, y: 0 };
    let dragClone = null;

    function makeDraggable(element, source, pileIndex, cardIndex = null) {
        element.addEventListener('mousedown', (e) => onDragStart(e, element, source, pileIndex, cardIndex));
        element.addEventListener('touchstart', (e) => onDragStart(e, element, source, pileIndex, cardIndex), { passive: false });
    }

    function onDragStart(e, element, source, pileIndex, cardIndex) {
        if (e.type === 'mousedown' && e.button !== 0) return; // Only left click
        e.preventDefault(); // Prevent scrolling on touch

        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        draggedCard = { source, pileIndex, cardIndex };
        dragSource = element;

        // Calculate offset
        const rect = element.getBoundingClientRect();
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
        originalPosition.x = rect.left;
        originalPosition.y = rect.top;

        // Create clone for dragging
        dragClone = element.cloneNode(true);
        dragClone.style.position = 'fixed';
        dragClone.style.zIndex = 1000;
        dragClone.style.left = `${rect.left}px`;
        dragClone.style.top = `${rect.top}px`;
        dragClone.style.pointerEvents = 'none'; // Allow events to pass through to underlying elements
        document.body.appendChild(dragClone);

        // Hide original temporarily
        element.style.opacity = '0.5';

        if (e.type === 'mousedown') {
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', onDragEnd);
        } else {
            document.addEventListener('touchmove', onDrag, { passive: false });
            document.addEventListener('touchend', onDragEnd);
        }
    }

    function onDrag(e) {
        if (!dragClone) return;
        e.preventDefault(); // Prevent scrolling

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        dragClone.style.left = `${clientX - dragOffset.x}px`;
        dragClone.style.top = `${clientY - dragOffset.y}px`;
    }

    function onDragEnd(e) {
        if (!draggedCard) return;

        // Remove listeners
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('touchend', onDragEnd);

        // Get clone rect before removing
        const cloneRect = dragClone.getBoundingClientRect();

        // Remove clone
        if (dragClone) {
            dragClone.remove();
            dragClone = null;
        }

        // Restore opacity
        if (dragSource) {
            dragSource.style.opacity = '1';
        }

        // Find best drop target based on intersection area
        const potentialTargets = document.querySelectorAll('.tableau, .foundation');
        let bestTarget = null;
        let maxOverlapArea = 0;

        potentialTargets.forEach(target => {
            let targetRect = target.getBoundingClientRect();

            // Expand tableau rect to include all cards
            if (target.classList.contains('tableau')) {
                const pileIndex = parseInt(target.id.split('-')[1]) - 1;
                const pile = state.tableau[pileIndex];
                if (pile && pile.length > 0) {
                    // Each card adds ~30px (see renderGame)
                    // Base height is card height (112px or var(--card-height))
                    // Let's approximate expansion
                    const extraHeight = (pile.length - 1) * 30;

                    // Create a new rect with expanded height
                    // We can't modify DOMRect directly, so we use a plain object
                    targetRect = {
                        left: targetRect.left,
                        right: targetRect.right,
                        top: targetRect.top,
                        bottom: targetRect.bottom + extraHeight,
                        width: targetRect.width,
                        height: targetRect.height + extraHeight
                    };
                }
            }

            // Calculate intersection
            const intersectionX = Math.max(0, Math.min(cloneRect.right, targetRect.right) - Math.max(cloneRect.left, targetRect.left));
            const intersectionY = Math.max(0, Math.min(cloneRect.bottom, targetRect.bottom) - Math.max(cloneRect.top, targetRect.top));
            const overlapArea = intersectionX * intersectionY;

            if (overlapArea > 0 && overlapArea > maxOverlapArea) {
                maxOverlapArea = overlapArea;
                bestTarget = target;
            }
        });

        // Also check if we are "close enough" even if not strictly overlapping (e.g. just released near it)
        // But for now, let's stick to overlap as it's much better than point. 
        // If no overlap, we could check distance to centers.

        if (!bestTarget) {
            // Fallback: check distance to center if no overlap (very loose)
            let minDistance = Infinity;
            potentialTargets.forEach(target => {
                const targetRect = target.getBoundingClientRect();
                const targetCenter = {
                    x: targetRect.left + targetRect.width / 2,
                    y: targetRect.top + targetRect.height / 2
                };
                const cloneCenter = {
                    x: cloneRect.left + cloneRect.width / 2,
                    y: cloneRect.top + cloneRect.height / 2
                };

                const dist = Math.hypot(targetCenter.x - cloneCenter.x, targetCenter.y - cloneCenter.y);
                // Threshold: e.g. within 100px
                if (dist < 100 && dist < minDistance) {
                    minDistance = dist;
                    bestTarget = target;
                }
            });
        }

        if (bestTarget) {
            handleDrop(bestTarget);
        }

        draggedCard = null;
        dragSource = null;
    }

    function handleDrop(targetEl) {
        let targetType = null;
        let targetPileIndex = -1;

        if (targetEl.classList.contains('tableau')) {
            targetType = 'tableau';
            targetPileIndex = parseInt(targetEl.id.split('-')[1]) - 1;
        } else if (targetEl.classList.contains('foundation')) {
            targetType = 'foundation';
            targetPileIndex = parseInt(targetEl.id.split('-')[1]) - 1;
        }

        if (targetType) {
            attemptMove(draggedCard, { type: targetType, index: targetPileIndex });
        }
    }

    function attemptMove(from, to) {
        // Get the cards to move
        let cardsToMove = [];
        let sourcePile = [];

        if (from.source === 'waste') {
            sourcePile = state.waste;
            cardsToMove = [sourcePile[sourcePile.length - 1]];
        } else if (from.source === 'tableau') {
            sourcePile = state.tableau[from.pileIndex];
            cardsToMove = sourcePile.slice(from.cardIndex);
        } else if (from.source === 'foundation') {
            sourcePile = state.foundations[from.pileIndex];
            cardsToMove = [sourcePile[sourcePile.length - 1]];
        }

        const movingCard = cardsToMove[0];

        // Validation Logic
        let isValid = false;
        let targetPile = [];

        if (to.type === 'tableau') {
            targetPile = state.tableau[to.index];
            if (targetPile.length === 0) {
                // King only on empty tableau
                if (movingCard.rank === 13) isValid = true;
            } else {
                const targetCard = targetPile[targetPile.length - 1];
                // Alternating color and descending rank
                if (isAlternatingColor(movingCard, targetCard) && movingCard.rank === targetCard.rank - 1) {
                    isValid = true;
                }
            }
        } else if (to.type === 'foundation') {
            // Can only move one card to foundation
            if (cardsToMove.length === 1) {
                // Find the correct foundation index for this card's suit
                // The order in HTML is: hearts, diamonds, clubs, spades
                const suitOrder = ['hearts', 'diamonds', 'clubs', 'spades'];
                const correctIndex = suitOrder.indexOf(movingCard.suit);

                if (correctIndex !== -1) {
                    // Redirect to the correct pile
                    to.index = correctIndex;
                    targetPile = state.foundations[to.index];

                    if (targetPile.length === 0) {
                        if (movingCard.rank === 1) isValid = true;
                    } else {
                        const targetCard = targetPile[targetPile.length - 1];
                        if (movingCard.rank === targetCard.rank + 1) isValid = true;
                    }
                }
            }
        }

        if (isValid) {
            // Execute Move
            if (from.source === 'waste') {
                state.waste.pop();
            } else if (from.source === 'tableau') {
                state.tableau[from.pileIndex].splice(from.cardIndex, cardsToMove.length);
                // Flip new top card if needed
                if (state.tableau[from.pileIndex].length > 0) {
                    const newTop = state.tableau[from.pileIndex][state.tableau[from.pileIndex].length - 1];
                    if (!newTop.faceUp) {
                        newTop.faceUp = true;
                    }
                }
            } else if (from.source === 'foundation') {
                state.foundations[from.pileIndex].pop();
            }

            if (to.type === 'tableau') {
                state.tableau[to.index].push(...cardsToMove);
            } else if (to.type === 'foundation') {
                state.foundations[to.index].push(cardsToMove[0]);
            }

            // Decrease score for any move
            state.score = Math.max(0, state.score - 1);

            renderGame();
            checkWin();
        }
    }

    function isAlternatingColor(card1, card2) {
        const isRed1 = card1.suit === 'hearts' || card1.suit === 'diamonds';
        const isRed2 = card2.suit === 'hearts' || card2.suit === 'diamonds';
        return isRed1 !== isRed2;
    }

    function checkWin() {
        const totalFoundation = state.foundations.reduce((acc, pile) => acc + pile.length, 0);
        if (totalFoundation === 52) {
            setTimeout(() => alert('Congratulations! You Won!'), 100);
        }
    }

    initGame();
});
