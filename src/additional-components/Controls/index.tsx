import React, { memo, useCallback, HTMLAttributes, FC, useEffect, useState } from 'react';
import cc from 'classcat';

import { useStoreState, useStoreActions } from '../../store/hooks';

import PlusIcon from '../../../assets/icons/plus.svg';
import MinusIcon from '../../../assets/icons/minus.svg';
import FitviewIcon from '../../../assets/icons/fitview.svg';
import LockIcon from '../../../assets/icons/lock.svg';
import UnlockIcon from '../../../assets/icons/unlock.svg';

import useZoomPanHelper from '../../hooks/useZoomPanHelper';
import { FitViewParams } from '../../types';
import useKeyPress from '../../hooks/useKeyPress';

export interface ControlProps extends HTMLAttributes<HTMLDivElement> {
  OS: OSName | null;
  showZoom?: boolean;
  showFitView?: boolean;
  showInteractive?: boolean;
  fitViewParams?: FitViewParams;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  onInteractiveChange?: (interactiveStatus: boolean) => void;
}

export interface ControlButtonProps extends HTMLAttributes<HTMLDivElement> {}

enum OSName {
  Windows = "Windows",
  Mac = "Mac"
}

export const ControlButton: FC<ControlButtonProps> = ({ children, className, ...rest }) => (
  <div className={cc(['react-flow__controls-button', className])} {...rest}>
    {children}
  </div>
);

const Controls: FC<ControlProps> = ({
  style,
  showZoom = true,
  showFitView = true,
  showInteractive = true,
  fitViewParams,
  onZoomIn,
  onZoomOut,
  onFitView,
  onInteractiveChange,
  OS,
  className,
  children,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const setInteractive = useStoreActions((actions) => actions.setInteractive);
  const { zoomIn, zoomOut, fitView } = useZoomPanHelper();

  const isInteractive = useStoreState((s) => s.nodesDraggable && s.nodesConnectable && s.elementsSelectable);
  const mapClasses = cc(['react-flow__controls', className]);

  const onZoomInHandler = useCallback(() => {
    zoomIn?.();
    onZoomIn?.();
  }, [zoomIn, onZoomIn]);

  const onZoomOutHandler = useCallback(() => {
    zoomOut?.();
    onZoomOut?.();
  }, [zoomOut, onZoomOut]);

  const onFitViewHandler = useCallback(() => {
    fitView?.(fitViewParams);
    onFitView?.();
  }, [fitView, fitViewParams, onFitView]);

  const onInteractiveChangeHandler = useCallback(() => {
    setInteractive?.(!isInteractive);
    onInteractiveChange?.(!isInteractive);
  }, [isInteractive, setInteractive, onInteractiveChange]);

  useEffect(() => {
    setIsVisible(true);
    setInteractive?.(true);
  }, []);

  const isControlPressed = useKeyPress("Control")
  const isCommandPressed = useKeyPress("Meta")
  const isControlOrCommandPressedPerOS = (OS === OSName.Windows && isControlPressed) || (OS === OSName.Mac && isCommandPressed)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {

      const isZoomingIn = isControlOrCommandPressedPerOS && e.key === "=";
      if (isZoomingIn) {
        e.preventDefault();

        onZoomInHandler?.();
      }

      const isZoomingOut = isControlOrCommandPressedPerOS && e.key === "-";
      if (isZoomingOut) {
        e.preventDefault();

        onZoomOutHandler?.();
      }
      
    } 
    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onZoomInHandler, onZoomOutHandler, isControlOrCommandPressedPerOS]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={mapClasses} style={style}>
      {showZoom && (
        <>
          <ControlButton onClick={onZoomInHandler} className={cc(["react-flow__controls-zoomin", "react-flow__controls-button-border-right"])}>
            <PlusIcon />
          </ControlButton>
          <ControlButton onClick={onZoomOutHandler} className={cc(["react-flow__controls-zoomout", "react-flow__controls-button-border-right"])}>
            <MinusIcon />
          </ControlButton>
        </>
      )}
      {showFitView && (
        <ControlButton className={cc(["react-flow__controls-fitview", "react-flow__controls-button-border-right"])} onClick={onFitViewHandler}>
          <FitviewIcon />
        </ControlButton>
      )}
      {showInteractive && (
        <ControlButton className="react-flow__controls-interactive" onClick={onInteractiveChangeHandler}>
          {isInteractive ? <UnlockIcon /> : <LockIcon />}
        </ControlButton>
      )}
      {children}
    </div>
  );
};

Controls.displayName = 'Controls';

export default memo(Controls);
