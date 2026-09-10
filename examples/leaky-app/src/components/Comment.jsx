export default function Comment({ comment }) {
  return (
    <div className="comment">
      <strong>{comment.author}</strong>
      <div dangerouslySetInnerHTML={{ __html: comment.body }} />
    </div>
  );
}
