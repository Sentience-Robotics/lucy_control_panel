/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

export const CATEGORIES_PER_PAGE_KEY = 'categoriesPerPage';
const DEFAULT_CATEGORIES_PER_PAGE = 1;

const getStoredCategoriesPerPage = (): number => {
    const storedValue = Number.parseInt(
        localStorage.getItem(CATEGORIES_PER_PAGE_KEY) ?? '',
        10,
    );

    return Number.isInteger(storedValue) && storedValue > 0
        ? storedValue
        : DEFAULT_CATEGORIES_PER_PAGE;
};

interface PaginatedCategoriesContextValue {
    categoriesPerPage: number;
    setCategoriesPerPage: (value: number) => void;
}

const PaginatedCategoriesContext = createContext<PaginatedCategoriesContextValue | null>(null);

export const PaginatedCategoriesProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [categoriesPerPage, setCategoriesPerPageState] = useState(getStoredCategoriesPerPage);

    const setCategoriesPerPage = useCallback((value: number) => {
        const normalizedValue = Number.isInteger(value) && value > 0
            ? value
            : DEFAULT_CATEGORIES_PER_PAGE;

        setCategoriesPerPageState(normalizedValue);
        localStorage.setItem(CATEGORIES_PER_PAGE_KEY, String(normalizedValue));
    }, []);

    useEffect(() => {
        localStorage.setItem(CATEGORIES_PER_PAGE_KEY, String(categoriesPerPage));
    }, [categoriesPerPage]);

    const contextValue = useMemo(
        () => ({ categoriesPerPage, setCategoriesPerPage }),
        [categoriesPerPage, setCategoriesPerPage],
    );

    return (
        <PaginatedCategoriesContext.Provider value={contextValue}>
            {children}
        </PaginatedCategoriesContext.Provider>
    );
};

export const usePaginatedCategories = (): PaginatedCategoriesContextValue => {
    const context = useContext(PaginatedCategoriesContext);
    if (!context) {
        throw new Error('usePaginatedCategories must be used within PaginatedCategoriesProvider');
    }
    return context;
};
