import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DownloadButton } from '../DownloadButton';
import * as actions from '@/app/skills/actions';

describe('DownloadButton Component', () => {
  beforeEach(() => {
    vi.spyOn(actions, 'incrementDownloadAction').mockResolvedValue({
      success: true,
      downloadsCount: 10,
    });
    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders download button and executes increment and file generation on click', async () => {
    render(
      <DownloadButton
        owner="test-owner"
        slug="test-slug"
        name="Test Skill"
        description="A skill for testing download"
        license="MIT"
        version="1.0.0"
      />
    );

    const btn = screen.getByTestId('download-skill-btn');
    expect(btn).toBeDefined();
    expect(btn.textContent).toContain('Descargar');

    await React.act(async () => {
      fireEvent.click(btn);
    });

    await waitFor(() => {
      expect(actions.incrementDownloadAction).toHaveBeenCalledWith('test-owner', 'test-slug');
    });

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });
});
