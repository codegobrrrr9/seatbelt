import DOMPurify from 'isomorphic-dompurify';

export default function Comment({ comment }) {
  return (
    <div className="comment">
      <strong>{comment.author}</strong>
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.body) }} />
    </div>
  );
}
