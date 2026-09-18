import '@testing-library/jest-dom/vitest';

// jsdom does not implement scrolling; the route scroll manager calls it on navigation.
window.scrollTo = () => {};
