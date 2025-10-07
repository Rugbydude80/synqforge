import { AIService } from './lib/services/ai.service.ts';

async function testAIGeneration() {
  try {
    console.log('Testing AI story generation...');

    const aiService = new AIService();

    const stories = await aiService.generateStories(
      'Allow users to reset their password via email',
      undefined,
      1,
      'claude-3-5-sonnet-20241022'
    );

    console.log('Success! Generated stories:', JSON.stringify(stories, null, 2));
  } catch (error) {
    console.error('Error:', error);
    console.error('Stack:', error.stack);
  }
}

testAIGeneration();
