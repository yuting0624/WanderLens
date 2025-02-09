import React from 'react';
import styled from 'styled-components';

const Loader = () => {
  return (
    <StyledWrapper>
      <div className="wrapper">
        <div className="blue ball" />
        <div className="red ball" />
        <div className="yellow ball" />
        <div className="green ball" />
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100px;
    perspective: 600px;
    transform-style: preserve-3d;
  }

  .ball {
    --size: 18px;
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    margin: 0 10px;
    animation: bounce 2s ease infinite;
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
    position: relative;
  }

  .ball::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    background: inherit;
    filter: blur(4px);
    opacity: 0.4;
    animation: pulse 2s ease infinite;
  }

  .blue {
    background: linear-gradient(135deg, #60a5fa, #3b82f6);
  }

  .red {
    background: linear-gradient(135deg, #93c5fd, #60a5fa);
    animation-delay: 0.25s;
  }

  .yellow {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    animation-delay: 0.5s;
  }

  .green {
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    animation-delay: 0.75s;
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(25px) scale(0.9);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.4;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.3);
    }
  }`;

export default Loader;
