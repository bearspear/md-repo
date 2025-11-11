const natural = require('natural');
const TfIdf = natural.TfIdf;

class MarkdownProcessor {
  constructor() {
    this.tfidf = new TfIdf();
  }

  async process(markdownContent, frontmatter = {}) {
    // Extract plain text (remove markdown syntax)
    const plainText = this.stripMarkdown(markdownContent);

    // Extract title
    const title = this.extractTitle(markdownContent, frontmatter);

    // Extract tags from frontmatter or content
    const tags = this.extractTags(markdownContent, frontmatter);

    // Extract topics using TF-IDF
    const topics = this.extractTopics(plainText);

    // Calculate word count
    const wordCount = this.countWords(plainText);

    return {
      title,
      plainText,
      tags,
      topics,
      wordCount
    };
  }

  stripMarkdown(markdown) {
    let text = markdown;

    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`[^`]*`/g, '');

    // Remove images
    text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');

    // Remove links but keep text
    text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

    // Remove headers
    text = text.replace(/^#{1,6}\s+/gm, '');

    // Remove bold/italic
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
    text = text.replace(/(\*|_)(.*?)\1/g, '$2');

    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, '');

    // Remove horizontal rules
    text = text.replace(/^-{3,}$/gm, '');
    text = text.replace(/^\*{3,}$/gm, '');

    // Clean up extra whitespace
    text = text.replace(/\n\s*\n/g, '\n\n');
    text = text.trim();

    return text;
  }

  extractTitle(markdown, frontmatter) {
    // First check frontmatter
    if (frontmatter.title) {
      return frontmatter.title;
    }

    // Then look for first heading
    const headingMatch = markdown.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }

    // Finally use first line
    const firstLine = markdown.split('\n')[0];
    return firstLine.substring(0, 100).trim() || 'Untitled';
  }

  extractTags(markdown, frontmatter) {
    const tags = new Set();

    // From frontmatter
    if (frontmatter.tags) {
      const fmTags = Array.isArray(frontmatter.tags)
        ? frontmatter.tags
        : frontmatter.tags.split(',').map(t => t.trim());
      fmTags.forEach(tag => tags.add(tag.toLowerCase()));
    }

    // From hashtags in content
    const hashtagMatches = markdown.match(/#(\w+)/g);
    if (hashtagMatches) {
      hashtagMatches.forEach(tag => {
        tags.add(tag.substring(1).toLowerCase());
      });
    }

    return Array.from(tags);
  }

  extractTopics(plainText) {
    // Add document to TF-IDF
    this.tfidf.addDocument(plainText.toLowerCase());

    const topics = [];
    const docIndex = this.tfidf.documents.length - 1;

    // Get top 5 terms by TF-IDF score
    this.tfidf.listTerms(docIndex).slice(0, 5).forEach(item => {
      if (item.term.length > 3 && item.tfidf > 0.5) {
        topics.push(item.term);
      }
    });

    // Add framework/technology detection
    const techTopics = this.detectTechnologies(plainText);
    techTopics.forEach(tech => topics.push(tech));

    // Remove duplicates
    return [...new Set(topics)];
  }

  detectTechnologies(text) {
    const technologies = [];
    const lowerText = text.toLowerCase();

    const techPatterns = {
      'angular': /\bangular\b|@component|ngmodule/i,
      'react': /\breact\b|jsx|usestate|useeffect/i,
      'vue': /\bvue\b|vue\.js/i,
      'node': /\bnode\.js\b|\bexpress\b/i,
      'typescript': /\btypescript\b|\.ts\b/i,
      'javascript': /\bjavascript\b|\.js\b/i,
      'python': /\bpython\b|\.py\b/i,
      'database': /\bsql\b|database|postgres|mongodb/i,
      'api': /\bapi\b|rest|graphql|endpoint/i,
      'docker': /\bdocker\b|container/i,
      'git': /\bgit\b|github|gitlab/i
    };

    for (const [tech, pattern] of Object.entries(techPatterns)) {
      if (pattern.test(lowerText)) {
        technologies.push(tech);
      }
    }

    return technologies;
  }

  countWords(text) {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }
}

module.exports = MarkdownProcessor;
