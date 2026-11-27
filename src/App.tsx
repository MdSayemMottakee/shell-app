/**
 * App — root component exposed via Module Federation as `./App`.
 *
 * Routes are relative segments under `/apps/{slug}`. Never use a leading `/`
 * on Route paths or Link hrefs. Use `useAppPath()` for every in-app link.
 */

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import './index.css';
import { FederatedAppRoot } from './lib/FederatedStyleRoot';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditPage } from './pages/AuditPage';
import { HomePage } from './pages/HomePage';
import { ManagePage } from './pages/ManagePage';
import { PostEditorPage } from './pages/PostEditorPage';
import { PostPage } from './pages/PostPage';

const App: React.FC = () => (
    <FederatedAppRoot>
        <Routes>
            <Route index element={<HomePage />} />
            <Route path="home" element={<HomePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="manage" element={<ManagePage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="posts/new" element={<PostEditorPage />} />
            <Route path="posts/:slug" element={<PostPage />} />
            <Route path="posts/:slug/edit" element={<PostEditorPage />} />
        </Routes>
    </FederatedAppRoot>
);

export default App;
