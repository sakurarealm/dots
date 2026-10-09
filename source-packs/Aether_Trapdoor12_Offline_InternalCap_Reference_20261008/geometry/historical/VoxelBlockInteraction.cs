using Aether.Entities;

namespace Aether.Voxel
{
    /// <summary>Server-side block state changes. Both chunk and local-volume paths preserve tint.</summary>
    public static class VoxelBlockInteraction
    {
        static readonly Collider[] overlaps = new Collider[64];
        static AudioClip woodClick, metalClick;

        public static bool CanToggle(Vox vox) => vox.shapeId is VoxShape.Trapdoor or VoxShape.Lattice
            or VoxShape.Panel or VoxShape.FenceGate or VoxShape.Window;

        public static bool TouchingLadder(CharacterController body)
        {
            if (!body) return false;
            // Sample above/below the rung gap so climbing does not alternate with free-fall.
            for (int i = 0; i < 3; i++)
            {
                var origin = body.bounds.center + Vector3.up * ((i - 1) * .125f);
                if (!Physics.Raycast(origin, body.transform.forward, out var hit,
                    body.radius + .45f, ~0, QueryTriggerInteraction.Ignore)) continue;
                var point = hit.point - hit.normal * .002f;
                var volume = hit.collider.GetComponentInParent<VoxelVolume>();
                if (volume)
                {
                    if (volume.GetVoxel(volume.transform.InverseTransformPoint(point).FloorToInt(), out var local)
                        && local.shapeId == VoxShape.Ladder) return true;
                }
                else
                {
                    var cs = ChunkSystem.terrain;
                    if (cs && cs.GetVoxel(point.FloorToInt(), out var world) && world.shapeId == VoxShape.Ladder) return true;
                }
            }
            return false;
        }

        public static bool TryToggle(PlayerEntity player, in InputManager.HitResult hit)
        {
            if (!player || !player.isServer || !CanToggle(hit.vox) || hit.distance > 4f ||
                !(hit.isHitVoxel || hit.isHitVoxelVolume)) return false;
            var volume = hit.isHitVoxelVolume ? hit.voxelVolume : null;
            var cs = ChunkSystem.terrain;
            var cell = volume ? hit.voxLocalPos : hit.voxpos;
            Vox current;
            if (volume ? !volume.GetVoxel(cell, out current) : !cs || !cs.GetVoxel(cell, out current)) return false;
            if (!CanToggle(current)) return false;
            var next = current;
            next.IsOpen = !current.IsOpen;
            var boxes = new List<VoxelVolumeColliderBuilder.BoxSpec>();
            Vox Neighbor(IVec3 p)
            {
                if (volume) return volume.GetVoxel(p, out var v) ? v : Vox.Nil;
                return cs.GetVoxel(p, out var w) ? w : Vox.Nil;
            }
            var otherCell = cell + new IVec3(0, (current.metadata & 32) != 0 ? -1 : 1, 0);
            var other = Neighbor(otherCell);
            bool paired = current.shapeId == VoxShape.Panel && other.shapeId == VoxShape.Panel &&
                other.texId == current.texId && ((other.metadata ^ current.metadata) & 32) != 0;
            if (paired)
            {
                other.IsOpen = next.IsOpen;
                VoxelBlockPhysics.Append(boxes, otherCell, other, Neighbor);
            }
            VoxelBlockPhysics.Append(boxes, cell, next, Neighbor);
            // Never sweep a door/hatch through a living body. Saturated queries fail closed.
            foreach (var box in boxes)
            {
                var center = volume ? volume.transform.TransformPoint(box.center) : box.center;
                var scale = volume ? volume.transform.lossyScale : Vector3.one;
                var half = Vector3.Scale(box.size * .48f, new Vector3(Mathf.Abs(scale.x), Mathf.Abs(scale.y), Mathf.Abs(scale.z)));
                int count = Physics.OverlapBoxNonAlloc(center, half, overlaps,
                    volume ? volume.transform.rotation : Quaternion.identity, ~0, QueryTriggerInteraction.Ignore);
                if (count == overlaps.Length) return true;
                for (int i = 0; i < count; i++)
                    if (overlaps[i] && overlaps[i].GetComponentInParent<LivingEntity>()) return true;
            }
            if (volume)
            {
                volume.SetVoxel(cell, next, false);
                if (paired) volume.SetVoxel(otherCell, other, false);
                volume.RebuildAll();
                Aether.AI.Navigation.NavDirty.Notify(hit.point.FloorToInt());
            }
            else
            {
                cs.SetVoxel(cell, next);
                if (paired) cs.SetVoxel(otherCell, other);
                var bounds = new Bounds((Vector3)cell + Vector3.one * .5f, Vector3.one);
                if (paired) bounds.Encapsulate(new Bounds((Vector3)otherCell + Vector3.one * .5f, Vector3.one));
                cs.MarkChunkMeshDirty(bounds);
                cs.MarkChunkSaveDirty(bounds);
            }
            PlaySound(current.texId, hit.point);
            return true;
        }

        public static void PlaySound(int texture, Vector3 point)
        {
            string id = VoxTexRegistry.instance?.At(texture)?.registryId ?? "";
            bool metal = id.Contains("iron") || id.Contains("copper") || id.Contains("metal");
            var clip = metal ? metalClick : woodClick;
            if (!clip)
            {
                // Original short mechanical sound, no third-party audio dependency.
                var samples = new float[7200];
                uint state = 1741;
                for (int i = 0; i < samples.Length; i++)
                {
                    state = state * 1664525u + 1013904223u;
                    float t = i / 24000f;
                    float noise = (state >> 8) / 8388608f - 1;
                    samples[i] = (.35f * noise + .65f * Mathf.Sin(t * (metal ? 4900 : 1300)))
                        * Mathf.Exp(-t * (metal ? 24 : 48)) * .35f;
                }
                clip = AudioClip.Create(metal ? "BlockMetalLatch" : "BlockWoodLatch", samples.Length, 1, 24000, false);
                clip.SetData(samples, 0);
                if (metal) metalClick = clip; else woodClick = clip;
            }
            AudioSource.PlayClipAtPoint(clip, point, AudioChannels.Get(AudioChannel.Block));
        }
    }
}
