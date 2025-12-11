import React, { useState } from 'react';
import { Sparkles, RefreshCw, Heart, Trophy } from 'lucide-react';
import './TicTacToe.css';

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameStatus, setGameStatus] = useState('playing');
  const [promoCode, setPromoCode] = useState('');
  const [showModal, setShowModal] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL;

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const sendGameResult = async (result, code = null) => {
    try {
      const response = await fetch(`${API_URL}/api/game/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, promoCode: code })
      });
      const data = await response.json();
      if (!data.success) console.error('Failed to send notification:', data.error);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const checkWinner = (squares) => {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (let line of lines) {
      const [a,b,c] = line;
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c])
        return { winner: squares[a], line };
    }
    if (squares.every(s => s !== null)) return { winner: 'draw', line: null };
    return { winner: null, line: null };
  };

  const minimax = (squares, depth, isMaximizing) => {
    const result = checkWinner(squares);
    if (result.winner === 'O') return 10 - depth;
    if (result.winner === 'X') return depth - 10;
    if (result.winner === 'draw') return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'O';
          bestScore = Math.max(bestScore, minimax(squares, depth + 1, false));
          squares[i] = null;
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'X';
          bestScore = Math.min(bestScore, minimax(squares, depth + 1, true));
          squares[i] = null;
        }
      }
      return bestScore;
    }
  };

  const getBestMove = (squares) => {
    let bestScore = -Infinity;
    let bestMove = null;
    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        squares[i] = 'O';
        let score = minimax(squares, 0, false);
        squares[i] = null;
        if (score > bestScore) { bestScore = score; bestMove = i; }
      }
    }
    return bestMove;
  };

  const handleClick = (index) => {
    if (board[index] || !isPlayerTurn || gameStatus !== 'playing') return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    setIsPlayerTurn(false);

    const result = checkWinner(newBoard);
    if (result.winner) { handleGameEnd(result.winner, newBoard); return; }

    setTimeout(() => {
      const aiMove = getBestMove(newBoard);
      if (aiMove !== null) {
        newBoard[aiMove] = 'O';
        setBoard(newBoard);
        const aiResult = checkWinner(newBoard);
        if (aiResult.winner) handleGameEnd(aiResult.winner, newBoard);
        else setIsPlayerTurn(true);
      }
    }, 500);
  };

  const handleGameEnd = (winner, finalBoard) => {
    setGameStatus(winner);
    if (winner === 'X') {
      const code = generatePromoCode();
      setPromoCode(code);
      sendGameResult('win', code);
    } else if (winner === 'O') sendGameResult('lose');
    else sendGameResult('draw');
    setShowModal(true);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setGameStatus('playing');
    setPromoCode('');
    setShowModal(false);
  };

  return (
    <div className="tic-container">
      <div className="tic-wrapper">
        <div className="tic-header">
          <div className="tic-title">
            <Sparkles className="sparkle" />
            <h1>Крестики-нолики</h1>
            <Sparkles className="sparkle" />
          </div>
          <p>Сыграйте и выиграйте промокод!</p>
        </div>

        <div className="tic-board-container">
          <div className="tic-board">
            {board.map((cell, index) => (
              <button
                key={index}
                onClick={() => handleClick(index)}
                disabled={!isPlayerTurn || gameStatus !== 'playing'}
                className={`tic-cell ${cell ? `filled-${cell}` : ''}`}
              >
                {cell === 'X' && <Heart className="heart-icon" />}
                {cell === 'O' && '★'}
              </button>
            ))}
          </div>
          <div className="tic-controls">
            <p>{gameStatus === 'playing' ? (isPlayerTurn ? '💕 Ваш ход' : '⭐ Ход компьютера...') : ''}</p>
            <button className="reset-button" onClick={resetGame}>
              <RefreshCw className="icon" /> Новая игра
            </button>
          </div>
        </div>

        <div className="tic-tip">
          💡 <strong>Совет:</strong> Начните с угла для лучших шансов на победу!
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            {gameStatus === 'X' ? (
              <div className="modal-win">
                <Trophy className="trophy" />
                <h2>Поздравляем! 🎉</h2>
                <p>Вы победили! Ваш промокод:</p>
                <div className="promo-code">{promoCode}</div>
                <p className="promo-sent">✅ Промокод отправлен администратору</p>
                <button className="modal-button" onClick={resetGame}>Сыграть ещё раз</button>
              </div>
            ) : gameStatus === 'O' ? (
              <div className="modal-lose">
                <div className="emoji">😔</div>
                <h2>Не расстраивайтесь!</h2>
                <p>Компьютер очень силён в этой игре.<br/>Попробуйте начать с угла - это даёт больше шансов!</p>
                <button className="modal-button" onClick={resetGame}>Попробовать снова</button>
              </div>
            ) : (
              <div className="modal-draw">
                <div className="emoji">🤝</div>
                <h2>Ничья!</h2>
                <p>Отличная игра! Вы сыграли идеально!</p>
                <button className="modal-button" onClick={resetGame}>Сыграть ещё раз</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicTacToe;