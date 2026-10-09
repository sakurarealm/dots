using System;
using System.Collections.Generic;

namespace Aether.Voxel
{
    /// <summary>
    /// 将 Minecraft 方块状态属性（如 <c>facing=north,half=top,open=true</c>）转为 <see cref="Vox"/> metadata。
    /// 编码见 <see cref="Vox.Orientation"/> / <see cref="Vox.IsUp"/> / <see cref="Vox.IsOpen"/>。
    /// </summary>
    static class McBlockStateMetadata
    {
        public static Dictionary<string, string> ParseProperties(string blockState)
        {
            var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (string.IsNullOrWhiteSpace(blockState))
                return result;

            var bracket = blockState.IndexOf('[');
            if (bracket < 0 || !blockState.EndsWith("]"))
                return result;

            var inner = blockState[(bracket + 1)..^1];
            if (string.IsNullOrWhiteSpace(inner))
                return result;

            foreach (var part in inner.Split(','))
            {
                var eq = part.IndexOf('=');
                if (eq <= 0)
                    continue;

                var key = part[..eq].Trim();
                var value = part[(eq + 1)..].Trim();
                if (key.Length > 0)
                    result[key] = value;
            }

            return result;
        }

        /// <summary>映射 JSON 可选 <c>"meta": "north,up,open"</c> 文字。</summary>
        public static bool TryParseMetaText(string metaText, out byte metadata)
        {
            metadata = 0;
            if (string.IsNullOrWhiteSpace(metaText))
                return false;

            var orient = Vox.OrientSouth;
            var isUp = false;
            var isOpen = false;

            foreach (var token in metaText.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                var part = token.Trim().ToLowerInvariant();
                switch (part)
                {
                    case "south":
                        orient = Vox.OrientSouth;
                        break;
                    case "west":
                        orient = Vox.OrientWest;
                        break;
                    case "north":
                        orient = Vox.OrientNorth;
                        break;
                    case "east":
                        orient = Vox.OrientEast;
                        break;
                    case "up":
                    case "top":
                        isUp = true;
                        break;
                    case "down":
                    case "bottom":
                        isUp = false;
                        break;
                    case "open":
                        isOpen = true;
                        break;
                    case "closed":
                        isOpen = false;
                        break;
                }
            }

            metadata = Pack(orient, isUp, isOpen);
            return true;
        }

        public static byte FromBlockState(string blockState, byte shapeId)
        {
            var props = ParseProperties(blockState);
            if (props.Count == 0)
                return 0;

            var orient = Vox.OrientSouth;
            var isUp = false;
            var isOpen = false;

            if (props.TryGetValue("facing", out var facing))
            {
                orient = facing.ToLowerInvariant() switch
                {
                    "north" => Vox.OrientNorth,
                    "south" => Vox.OrientSouth,
                    "east" => Vox.OrientEast,
                    "west" => Vox.OrientWest,
                    _ => Vox.OrientSouth
                };
            }

            if (props.TryGetValue("half", out var half))
                isUp = half.Equals("top", StringComparison.OrdinalIgnoreCase);
            else if (props.TryGetValue("type", out var type))
            {
                if (type.Equals("top", StringComparison.OrdinalIgnoreCase))
                    isUp = true;
                else if (type.Equals("bottom", StringComparison.OrdinalIgnoreCase))
                    isUp = false;
            }

            if (props.TryGetValue("open", out var open))
                isOpen = open.Equals("true", StringComparison.OrdinalIgnoreCase);

            if (shapeId == VoxShape.Wall)
            {
                // MC 墙用连接 flags；无 facing。有 up 连接时用 IsUp 作水平偏移提示。
                isUp = props.TryGetValue("up", out var up) &&
                       up.Equals("true", StringComparison.OrdinalIgnoreCase);
                if (props.TryGetValue("east", out var east) && east.Equals("true", StringComparison.OrdinalIgnoreCase))
                    orient = Vox.OrientEast;
                else if (props.TryGetValue("west", out var west) && west.Equals("true", StringComparison.OrdinalIgnoreCase))
                    orient = Vox.OrientWest;
                else if (props.TryGetValue("north", out var north) && north.Equals("true", StringComparison.OrdinalIgnoreCase))
                    orient = Vox.OrientNorth;
                else if (props.TryGetValue("south", out var south) && south.Equals("true", StringComparison.OrdinalIgnoreCase))
                    orient = Vox.OrientSouth;
            }

            var metadata = Pack(orient, isUp, isOpen);
            if (shapeId == VoxShape.Chain)
            {
                props.TryGetValue("axis", out var axis);
                metadata = (byte)(axis == "x" ? 16 : axis == "z" ? 32 : 0);
            }
            if ((shapeId == VoxShape.Panel || shapeId == VoxShape.Window || shapeId == VoxShape.Ladder) && props.ContainsKey("facing"))
            {
                // MC wall attachments face away from their support; our local model sits at +Z.
                metadata = (byte)((metadata & 0xFC) | ((orient + 2) & 3));
                if (props.TryGetValue("hinge", out var hinge) && hinge == "right") metadata |= 16;
            }
            if (shapeId == VoxShape.Panel && props.TryGetValue("half", out var halfPart) && halfPart == "upper") metadata |= 32;
            return metadata;
        }

        static byte Pack(int orient, bool isUp, bool isOpen) =>
            (byte)((orient & 0x03) | (isUp ? 0x04 : 0x00) | (isOpen ? 0x08 : 0x00));
    }
}
