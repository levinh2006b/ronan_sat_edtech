"use client";

import React, { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

import { getTestingRoomThemePreset, type TestingRoomTheme } from "@/lib/testingRoomTheme";

interface DesmosCalculatorProps {
    theme?: TestingRoomTheme;
    isOpen: boolean;
    onClose: () => void;
}

type DesmosCalculatorInstance = {
    destroy: () => void;
};

type DesmosNamespace = {
    GraphingCalculator: (element: HTMLDivElement, options: Record<string, unknown>) => DesmosCalculatorInstance;
};

declare global {
    interface Window {
        Desmos?: DesmosNamespace;
    }
}

export default function DesmosCalculator({ theme = "ronan", isOpen, onClose }: DesmosCalculatorProps) {

    const desmosUrl = process.env.NEXT_PUBLIC_DESMOS_URL; 
    const desmosTheme = getTestingRoomThemePreset(theme).desmos;
    const calculatorRef = useRef<HTMLDivElement>(null);
    const calculatorInst = useRef<DesmosCalculatorInstance | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, baseLeft: 0, baseTop: 0, width: 0 });

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isExpanded) return;
    if ((e.target as HTMLElement).closest('button')) return;
    
    setIsDragging(true);
    const modalElement = (e.currentTarget as HTMLElement).parentElement;
    
    let baseLeft = 0;
    let baseTop = 0;
    let width = 0;

    if (modalElement) {
        const rect = modalElement.getBoundingClientRect();
        baseLeft = rect.left - position.x;
        baseTop = rect.top - position.y;
        width = rect.width;
    }

    dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
        baseLeft: baseLeft,
        baseTop: baseTop,
        width: width
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
};

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isExpanded) return;

    let newX = e.clientX - dragStart.current.x;
    let newY = e.clientY - dragStart.current.y;

    const { baseLeft, baseTop, width } = dragStart.current;

    const absoluteLeft = baseLeft + newX;
    const absoluteTop = baseTop + newY;

    if (absoluteLeft < 0) {
        newX = -baseLeft;
    }

    if (absoluteLeft + width > window.innerWidth) {
        newX = window.innerWidth - width - baseLeft;
    }

    if (absoluteTop < 0) {
        newY = -baseTop;
    }

if (absoluteTop + 104 > window.innerHeight) {
    newY = window.innerHeight - 104 - baseTop;
}

    setPosition({ 
        x: newX, 
        y: newY 
    });
};

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

useEffect(() => {
    if (!isOpen) return;

    let checkInterval: NodeJS.Timeout;

    const initCalculator = () => {
        if (window.Desmos && calculatorRef.current && !calculatorInst.current) {
            calculatorInst.current = window.Desmos.GraphingCalculator(calculatorRef.current, {
                keypad: true,
                expressions: true,
                settingsMenu: true,
                zoomButtons: true,
                expressionsTopbar: true,
                lockViewport: false,
                border: false,
            });

            if (checkInterval) clearInterval(checkInterval);
        }
    };

    const existingScript = document.getElementById("desmos-script");
    if (!existingScript && !window.Desmos) {
        const script = document.createElement("script");
        script.src = desmosUrl || "https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";
        script.id = "desmos-script";
        script.async = true;
        script.onload = () => {
            initCalculator();
        };
        document.body.appendChild(script);
    }

    if (window.Desmos) {
        initCalculator();
    } else {
        checkInterval = setInterval(initCalculator, 500);
    }

    return () => {
        if (checkInterval) {
            clearInterval(checkInterval);
        }

        if (calculatorInst.current) {
            calculatorInst.current.destroy();
            calculatorInst.current = null;
        }
    };
}, [isOpen, desmosUrl]);
 
    if (!isOpen) return null;
 
    return (
        <div
            className={`fixed z-50 flex flex-col overflow-hidden ${!isDragging ? "transition-all duration-300 ease-in-out" : ""} ${desmosTheme.modalClass} ${isExpanded
                    ? "left-2 right-2 top-24 bottom-24 rounded-[2rem] sm:left-6 sm:right-6"
                    : "right-4 top-24 h-[min(70vh,600px)] w-[min(calc(100vw-2rem),500px)] rounded-[2rem] sm:right-6"
                }`}
            style={{
                transform: isExpanded ? 'none' : `translate(${position.x}px, ${position.y}px)`
            }}
        >
            <div
                className={`flex cursor-move items-center justify-between select-none px-3 py-2 sm:px-4 sm:py-3 ${desmosTheme.headerClass}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove} 
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div>
                    <div className={desmosTheme.badgeClass}>Math Tool</div>
                    <span className={`mt-2 block pl-1 text-lg tracking-tight sm:text-xl ${desmosTheme.titleClass}`}>
                        Desmos Graphing Calculator
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${desmosTheme.controlButtonClass}`}
                        title={isExpanded ? "Restore size" : "Maximize"}
                        type="button"
                    >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${desmosTheme.controlButtonClass}`}
                        title="Close calculator"
                        type="button"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div
                ref={calculatorRef}
                className={`min-h-0 flex-1 w-full overflow-hidden ${desmosTheme.bodyClass}`}
            >
            </div>
        </div>
    );
}
