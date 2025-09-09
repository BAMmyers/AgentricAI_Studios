import { NodeData, Edge, NodeType } from './types';

// --- Placeholder Data for the "Creative Storyboarding" Workflow ---
const storyTheme = "A friendly robot exploring a magical, glowing forest at night.";
const storyParagraph = "In the heart of an ancient, enchanted forest where giant mushrooms pulsed with soft, otherworldly light, lived a small, curious robot named Gizmo. Unlike the other robots built for logic and labor, Gizmo was filled with a sense of wonder. One evening, drawn by the shimmering spectacle, he ventured into the glowing woods, his metallic feet softly crunching on the phosphorescent moss.";
const characterDescription = "Gizmo is a small, friendly robot with a round, smooth chassis that resembles polished chrome. He has large, expressive camera-lens eyes that glow with a gentle blue light. His arms and legs are simple, articulated limbs, and he often carries a small canvas satchel for collecting interesting specimens from his explorations.";
const scenePrompt = "Gizmo, the friendly robot, marvels at a giant, glowing blue mushroom in the magical forest.";
const extractedElements = {
  "main_character": "Gizmo",
  "setting": "Enchanted, glowing forest at night",
  "key_objects": ["Giant mushrooms", "Phosphorescent moss", "Canvas satchel"]
};
// Placeholder for a generated image data URL
const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGZpbGw9IiM1NTUiIGQ9Ik0yMCAyMkg0Yy0xLjEwMyAwLTItLjg5Ny0yLTJWNGMwLTEuMTAzLjg5Ny0yIDItMmgxNmMxLjEwMyAwIDIgLjg5NyAyIDJ2MTZjMCAxLjEwMy0uODk3IDItMiAybTAtMTZINGwxMCAxMEwyMCA0WiIvPjwvc3ZnPg==';


export const prelimNodes: NodeData[] = [
  // --- Column 1: Inputs ---
  {
    id: 'TextInput-Theme-1',
    type: NodeType.TextInput,
    name: 'Main Story Theme',
    x: 50,
    y: 80,
    inputs: [],
    outputs: [{ id: 'text_out', name: 'Text', type: 'output', dataType: 'text' }],
    data: { 'text_out': storyTheme },
    isDynamic: false,
    color: 'bg-blue-600',
    icon: '💡',
    status: 'success',
    category: 'Input',
    currentWidth: 220,
    currentHeight: 120,
  },
  {
    id: 'Sketchpad-Scene-1',
    type: NodeType.Sketchpad,
    name: 'Scene Sketch',
    x: 50,
    y: 350,
    inputs: [],
    outputs: [{ id: 'sketch_image_out', name: 'Sketch', type: 'output', dataType: 'image' }],
    data: { 'sketch_image_out': null },
    isDynamic: false,
    color: 'bg-stone-500',
    icon: '✏️',
    status: 'idle',
    category: 'Creative',
    currentWidth: 220,
    currentHeight: 220,
  },

  // --- Column 2: AI Idea Expansion ---
  {
    id: 'Dynamic-Story-Expander-1',
    type: 'Story Idea Expander',
    name: 'Story Idea Expander',
    x: 350,
    y: 80,
    isDynamic: true,
    executionLogicPrompt: "You are a creative writer. Take the following story theme and expand it into a short, imaginative introductory paragraph (3-4 sentences). Theme: {theme_in}",
    inputs: [{ id: 'theme_in', name: 'Theme', type: 'input', dataType: 'text' }],
    outputs: [{ id: 'story_paragraph_out', name: 'Paragraph', type: 'output', dataType: 'text' }],
    data: { 'theme_in': storyTheme, 'story_paragraph_out': storyParagraph },
    color: 'bg-rose-500',
    icon: '📖',
    status: 'success',
    category: 'Custom Agents',
    currentWidth: 220,
    currentHeight: 100,
  },
  {
    id: 'Dynamic-Character-Designer-1',
    type: 'Character Designer',
    name: 'Character Designer',
    x: 350,
    y: 220,
    isDynamic: true,
    executionLogicPrompt: "You are a character designer. Based on the story paragraph, write a brief, visual description of the main character. Paragraph: {story_in}",
    inputs: [{ id: 'story_in', name: 'Story', type: 'input', dataType: 'text' }],
    outputs: [{ id: 'character_description_out', name: 'Description', type: 'output', dataType: 'text' }],
    data: { 'story_in': storyParagraph, 'character_description_out': characterDescription },
    color: 'bg-purple-600',
    icon: '🤖',
    status: 'success',
    category: 'Custom Agents',
    currentWidth: 220,
    currentHeight: 100,
  },
  {
    id: 'Dynamic-Element-Extractor-1',
    type: 'Key Element Extractor',
    name: 'Key Element Extractor',
    x: 350,
    y: 400,
    isDynamic: true,
    executionLogicPrompt: "Analyze the following text and extract the main character's name, the setting, and 2-3 key objects. Return the result as a single JSON object with keys: 'main_character', 'setting', 'key_objects' (an array). Text: {text_in}",
    inputs: [{ id: 'text_in', name: 'Text', type: 'input', dataType: 'text' }],
    outputs: [{ id: 'elements_out', name: 'Elements', type: 'output', dataType: 'json' }],
    data: { 'text_in': storyParagraph, 'elements_out': extractedElements },
    color: 'bg-fuchsia-600',
    icon: '🔬',
    status: 'success',
    category: 'Custom Agents',
    currentWidth: 220,
    currentHeight: 100,
  },

  // --- Column 3: Mid-Process Generation & Display ---
  {
    id: 'Image-Generator-Character-1',
    type: NodeType.ImageGenerator,
    name: 'Character Concept',
    x: 650,
    y: 220,
    inputs: [
      { id: 'prompt_in', name: 'Prompt', type: 'input', dataType: 'text' },
      { id: 'local_model_identifier_in', name: 'Local Model ID', type: 'input', dataType: 'text' }
    ],
    outputs: [{ id: 'image_out', name: 'Image', type: 'output', dataType: 'image' }],
    data: { 'prompt_in': characterDescription, 'image_out': placeholderImage },
    isDynamic: false,
    color: 'bg-teal-600',
    icon: '🖼️',
    status: 'success',
    category: 'AI / LLM',
    currentWidth: 220,
    currentHeight: 150,
  },
  {
    id: 'Display-Text-Story-1',
    type: NodeType.DisplayText,
    name: 'Story So Far',
    x: 650,
    y: 20,
    inputs: [{ id: 'text_in', name: 'Text', type: 'input', dataType: 'text' }],
    outputs: [],
    data: { 'text_in': storyParagraph },
    isDynamic: false,
    color: 'bg-slate-500',
    icon: '📄',
    status: 'success',
    category: 'Display',
    currentWidth: 280,
    currentHeight: 180,
  },
  {
    id: 'Display-Data-Elements-1',
    type: NodeType.DisplayData,
    name: 'Key Elements',
    x: 650,
    y: 450,
    inputs: [{ id: 'data_in', name: 'Data', type: 'input', dataType: 'any' }],
    outputs: [],
    data: { 'data_in': extractedElements },
    isDynamic: false,
    color: 'bg-green-600',
    icon: '📺',
    status: 'success',
    category: 'Display',
    currentWidth: 280,
    currentHeight: 160,
  },
  
  // --- Column 4: Final Scene Assembly ---
  {
    id: 'Multi-Prompt-Scene-1',
    type: NodeType.MultiPromptNode,
    name: 'Assemble Final Scene Prompt',
    x: 1000,
    y: 220,
    inputs: [
      // FIX: Added missing 'type' property to conform to the Port interface.
      { id: 'prompt_part_1', name: 'Character', type: 'input', dataType: 'any' },
      // FIX: Added missing 'type' property to conform to the Port interface.
      { id: 'prompt_part_2', name: 'Scene', type: 'input', dataType: 'any' },
      // FIX: Added missing 'type' property to conform to the Port interface.
      { id: 'prompt_part_3', name: 'Style', type: 'input', dataType: 'any' },
    ],
    // FIX: Added missing 'type' property to conform to the Port interface.
    outputs: [{ id: 'assembled_prompt_out', name: 'Assembled Prompt', type: 'output', dataType: 'text' }],
    data: { 
        'prompt_part_1': characterDescription,
        'prompt_part_2': scenePrompt, 
        'prompt_part_3': "digital painting, cinematic lighting, high detail"
    },
    isDynamic: false,
    color: 'bg-slate-600',
    icon: '🧩',
    status: 'success',
    category: 'Utility',
    currentWidth: 220,
    currentHeight: 180,
  },
  {
    id: 'Image-Generator-Final-Scene-1',
    type: NodeType.ImageGenerator,
    name: 'Generate Final Scene',
    x: 1280,
    y: 220,
    inputs: [
        { id: 'prompt_in', name: 'Prompt', type: 'input', dataType: 'text' },
        { id: 'local_model_identifier_in', name: 'Local Model ID', type: 'input', dataType: 'text' }
    ],
    outputs: [{ id: 'image_out', name: 'Image', type: 'output', dataType: 'image' }],
    data: { 'prompt_in': `${characterDescription}. ${scenePrompt}. digital painting, cinematic lighting, high detail`, 'image_out': placeholderImage },
    isDynamic: false,
    color: 'bg-teal-600',
    icon: '🎬',
    status: 'success',
    category: 'AI / LLM',
    currentWidth: 220,
    currentHeight: 150,
  },

  // --- Column 5: Final Display ---
  {
    id: 'Display-Image-Character-1',
    type: NodeType.DisplayImage,
    name: 'Character Concept',
    x: 1000,
    y: 430,
    inputs: [{ id: 'image_in', name: 'Image', type: 'input', dataType: 'image' }],
    outputs: [],
    data: { 'image_in': placeholderImage },
    isDynamic: false,
    color: 'bg-lime-600',
    icon: '🏞️',
    status: 'success',
    category: 'Display',
    currentWidth: 250,
    currentHeight: 200,
  },
  {
    id: 'Display-Image-Final-Scene-1',
    type: NodeType.DisplayImage,
    name: 'Final Scene',
    x: 1560,
    y: 150,
    inputs: [{ id: 'image_in', name: 'Image', type: 'input', dataType: 'image' }],
    outputs: [],
    data: { 'image_in': placeholderImage },
    isDynamic: false,
    color: 'bg-lime-600',
    icon: '🏞️',
    status: 'success',
    category: 'Display',
    currentWidth: 320,
    currentHeight: 280,
  },

];


export const prelimEdges: Edge[] = [
  // Theme -> Story Expander
  { id: 'edge-1', sourceNodeId: 'TextInput-Theme-1', sourceOutputId: 'text_out', targetNodeId: 'Dynamic-Story-Expander-1', targetInputId: 'theme_in' },
  // Story -> Character Designer
  { id: 'edge-2', sourceNodeId: 'Dynamic-Story-Expander-1', sourceOutputId: 'story_paragraph_out', targetNodeId: 'Dynamic-Character-Designer-1', targetInputId: 'story_in' },
  // Story -> Element Extractor
  { id: 'edge-3', sourceNodeId: 'Dynamic-Story-Expander-1', sourceOutputId: 'story_paragraph_out', targetNodeId: 'Dynamic-Element-Extractor-1', targetInputId: 'text_in' },
  // Story -> Display
  { id: 'edge-4', sourceNodeId: 'Dynamic-Story-Expander-1', sourceOutputId: 'story_paragraph_out', targetNodeId: 'Display-Text-Story-1', targetInputId: 'text_in' },
  // Character Description -> Image Generator
  { id: 'edge-5', sourceNodeId: 'Dynamic-Character-Designer-1', sourceOutputId: 'character_description_out', targetNodeId: 'Image-Generator-Character-1', targetInputId: 'prompt_in' },
  // Character Description -> Final Prompt Assembler
  { id: 'edge-6', sourceNodeId: 'Dynamic-Character-Designer-1', sourceOutputId: 'character_description_out', targetNodeId: 'Multi-Prompt-Scene-1', targetInputId: 'prompt_part_1' },
  // Extracted Elements -> Display
  { id: 'edge-7', sourceNodeId: 'Dynamic-Element-Extractor-1', sourceOutputId: 'elements_out', targetNodeId: 'Display-Data-Elements-1', targetInputId: 'data_in' },
  // Generated Character Image -> Display
  { id: 'edge-8', sourceNodeId: 'Image-Generator-Character-1', sourceOutputId: 'image_out', targetNodeId: 'Display-Image-Character-1', targetInputId: 'image_in' },
  // Assembled Prompt -> Final Image Generator
  { id: 'edge-9', sourceNodeId: 'Multi-Prompt-Scene-1', sourceOutputId: 'assembled_prompt_out', targetNodeId: 'Image-Generator-Final-Scene-1', targetInputId: 'prompt_in' },
  // Final Scene Image -> Final Display
  { id: 'edge-10', sourceNodeId: 'Image-Generator-Final-Scene-1', sourceOutputId: 'image_out', targetNodeId: 'Display-Image-Final-Scene-1', targetInputId: 'image_in' },
];
