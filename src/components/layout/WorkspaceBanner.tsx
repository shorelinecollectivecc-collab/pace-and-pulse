type WorkspaceBannerProps = {
  banner: string;
  name: string;
  description: string;
};

export default function WorkspaceBanner({
  banner,
  name,
  description,
}: WorkspaceBannerProps) {
  return (
    <section className="workspace-banner">
      <img src={banner} alt="" />
      <div className="workspace-banner-shade" />
      <div className="workspace-banner-copy">
        <p>{name}</p>
        <span>{description}</span>
      </div>
    </section>
  );
}
